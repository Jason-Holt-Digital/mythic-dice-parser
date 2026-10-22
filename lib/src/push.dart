import 'package:mythic_dice_parser/src/dice_roller.dart';
import 'package:mythic_dice_parser/src/enums.dart';
import 'package:mythic_dice_parser/src/push_lock.dart';
import 'package:mythic_dice_parser/src/roll_result.dart';
import 'package:mythic_dice_parser/src/roll_summary.dart';
import 'package:mythic_dice_parser/src/rolled_die.dart';

/// Whether a push keeps [die] as it is: constants (`singleVal` and
/// `totaled` dice, like the `+3` of `2d6+3`), dice an earlier push locked,
/// and dice [lockWhere] picks. Without [lockWhere], the die's `@lock=` rule
/// picks, and a die without one is kept when it is a (critical) success.
bool _keptOnPush(RolledDie die, bool Function(RolledDie)? lockWhere) =>
    die.locked ||
    die.dieType == DieType.singleVal ||
    die.totaled ||
    (lockWhere ?? (die.pushLock ?? PushLock.successes).locks)(die);

/// The dice of [summary] that [reroll] would re-roll with the same
/// [lockWhere], in result order.
///
/// Use it to tell whether a roll can be pushed at all, or to roll the
/// replacement dice elsewhere (physical dice, a 3D dice engine) before
/// feeding them to [reroll] through a `PreRolledDiceRoller`.
List<RolledDie> rerollableDice(
  RollSummary summary, {
  bool Function(RolledDie)? lockWhere,
}) => [
  for (final die in summary.results)
    if (!_keptOnPush(die, lockWhere)) die,
];

/// Re-roll unlocked dice from a previous [RollSummary].
///
/// [lockWhere] determines which dice to lock (true = lock, false = re-roll).
/// Without it, the formula's `@lock=` tags decide (see [PushLock]): each die
/// follows the rule of the innermost tagged group around it, and a die with
/// no rule is locked when it is a success or critical success.
/// Locked dice appear in the new result unchanged, with `locked: true`.
/// Unlocked dice are re-rolled using [roller], one new die in each die's
/// place. `singleVal` and `totaled` dice are auto-locked (constants like
/// +3). Both sides of a subtraction are re-rolled: a new die in the place
/// of a subtracted die is scored by the face it rolled, then subtracted.
///
/// Each new die is scored by the count operators (`#s`, `#f`, `#cs`, `#cf`)
/// that looked at the die it replaces, and carries those rules on (see
/// [RolledDie.scoreRules]), so a second push scores its new dice the same
/// way. Two pools score by their own rules: in `(2d6#s6) + (2d6#s>=5)` a
/// new 5 is a success only in the second pool.
///
/// Only scoring is re-applied. Operators that change the dice (clamp,
/// drop/keep, explode, compound, reroll, sort) are not run again: a new die
/// keeps the face it rolled, takes the place of a kept die, and does not
/// explode.
///
/// Can be called multiple times on successive results (multi-push). The
/// new summary's `pushCount` is one more than [summary]'s; it keeps the
/// formula's `pushLimit`, which this function does not enforce.
///
/// Returns a new [RollSummary] — does NOT mutate the original.
Future<RollSummary> reroll(
  RollSummary summary, {
  required DiceRoller roller,
  bool Function(RolledDie)? lockWhere,
}) async {
  final diceResultRoller = DiceResultRoller(roller);
  final newResults = <RolledDie>[];
  final newDiscarded = <RolledDie>[...summary.discarded];

  for (final die in summary.results) {
    if (_keptOnPush(die, lockWhere)) {
      newResults.add(RolledDie.copyWith(die, locked: true));
    } else {
      newDiscarded.add(RolledDie.copyWith(die, discarded: true));
      final rerolled = await diceResultRoller.reroll(die);
      newResults.addAll(rerolled.results.map((r) => _replacementFor(die, r)));
    }
  }

  final newRollResult = RollResult(
    expression: '${summary.expression} (push)',
    opType: OpType.reroll,
    results: newResults,
    discarded: newDiscarded,
    left: summary.detailedResults,
  );

  return RollSummary(
    detailedResults: newRollResult,
    pushCount: summary.pushCount + 1,
  );
}

/// [rolled] in the place of [replaced]: in its group, scored by its rules,
/// with its `@lock=` rule, and subtracted when [replaced] was.
RolledDie _replacementFor(RolledDie replaced, RolledDie rolled) {
  final scored = replaced.scoreRules.fold(
    RolledDie.copyWith(
      rolled,
      groupLabel: replaced.groupLabel,
      scoreRules: replaced.scoreRules,
      pushLock: replaced.pushLock,
    ),
    (die, rule) => rule.score(die),
  );
  return replaced.subtracted
      ? RolledDie.copyWith(scored, result: -scored.result, subtracted: true)
      : scored;
}
