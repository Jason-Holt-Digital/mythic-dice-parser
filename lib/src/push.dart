import 'package:mythic_dice_parser/src/dice_roller.dart';
import 'package:mythic_dice_parser/src/enums.dart';
import 'package:mythic_dice_parser/src/roll_result.dart';
import 'package:mythic_dice_parser/src/roll_summary.dart';
import 'package:mythic_dice_parser/src/rolled_die.dart';

/// Whether a push keeps [die] as it is: constants (`singleVal` and
/// `totaled` dice, like the `+3` of `2d6+3`), dice an earlier push locked,
/// and dice [lockWhere] picks.
bool _keptOnPush(RolledDie die, bool Function(RolledDie) lockWhere) =>
    die.locked ||
    die.dieType == DieType.singleVal ||
    die.totaled ||
    lockWhere(die);

/// The dice of [summary] that [reroll] would re-roll with the same
/// [lockWhere], in result order.
///
/// Use it to tell whether a roll can be pushed at all, or to roll the
/// replacement dice elsewhere (physical dice, a 3D dice engine) before
/// feeding them to [reroll] through a `PreRolledDiceRoller`.
List<RolledDie> rerollableDice(
  RollSummary summary, {
  required bool Function(RolledDie) lockWhere,
}) => [
  for (final die in summary.results)
    if (!_keptOnPush(die, lockWhere)) die,
];

/// Re-roll unlocked dice from a previous [RollSummary].
///
/// [lockWhere] determines which dice to lock (true = lock, false = re-roll).
/// Locked dice appear in the new result unchanged, with `locked: true`.
/// Unlocked dice are re-rolled using [roller], one new die in each die's
/// place. `singleVal` and `totaled` dice are auto-locked (constants like +3).
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
/// Can be called multiple times on successive results (multi-push).
///
/// Returns a new [RollSummary] — does NOT mutate the original.
Future<RollSummary> reroll(
  RollSummary summary, {
  required bool Function(RolledDie) lockWhere,
  required DiceRoller roller,
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

  return RollSummary(detailedResults: newRollResult);
}

/// [rolled] in the place of [replaced]: in its group, scored by its rules.
RolledDie _replacementFor(RolledDie replaced, RolledDie rolled) {
  if (replaced.groupLabel == null && replaced.scoreRules.isEmpty) return rolled;
  return replaced.scoreRules.fold(
    RolledDie.copyWith(
      rolled,
      groupLabel: replaced.groupLabel,
      scoreRules: replaced.scoreRules,
    ),
    (die, rule) => rule.score(die),
  );
}
