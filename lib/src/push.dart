import 'package:mythic_dice_parser/src/dice_roller.dart';
import 'package:mythic_dice_parser/src/enums.dart';
import 'package:mythic_dice_parser/src/roll_result.dart';
import 'package:mythic_dice_parser/src/roll_summary.dart';
import 'package:mythic_dice_parser/src/rolled_die.dart';

/// Re-roll unlocked dice from a previous [RollSummary].
///
/// [lockWhere] determines which dice to lock (true = lock, false = re-roll).
/// Locked dice appear in the new result unchanged, with `locked: true`.
/// Unlocked dice are re-rolled using [roller].
/// `singleVal` and `totaled` dice are auto-locked (constants like +3).
///
/// [rescore] optionally re-scores each re-rolled die. Scoring flags
/// (`success`, `failure`, etc.) are applied by AST-level count operations,
/// and push operates below the AST, so the parser cannot recover the
/// original predicates — callers supply a hook that stamps whatever flags
/// their rules need (e.g. via `RolledDie.scoreForCountType` or
/// `RolledDie.copyWith`). Each re-rolled die arrives unscored; the flags on
/// the die [rescore] returns are the ones kept. Locked dice keep their
/// original flags and are never passed through [rescore].
///
/// Can be called multiple times on successive results (multi-push).
///
/// Returns a new [RollSummary] — does NOT mutate the original.
Future<RollSummary> reroll(
  RollSummary summary, {
  required bool Function(RolledDie) lockWhere,
  required DiceRoller roller,
  RolledDie Function(RolledDie)? rescore,
}) async {
  final diceResultRoller = DiceResultRoller(roller);
  final newResults = <RolledDie>[];
  final newDiscarded = <RolledDie>[...summary.discarded];

  for (final die in summary.results) {
    // Auto-lock singleVal/totaled dice -- these are constants (e.g., +3)
    // that should never be re-rolled. Also respect already-locked dice
    // and the caller's lock predicate.
    final shouldLock =
        die.locked ||
        die.dieType == DieType.singleVal ||
        die.totaled ||
        lockWhere(die);
    if (shouldLock) {
      newResults.add(RolledDie.copyWith(die, locked: true));
    } else {
      newDiscarded.add(RolledDie.copyWith(die, discarded: true));
      final rerolled = await diceResultRoller.reroll(die);
      newResults.addAll(
        rerolled.results.map((r) {
          final relabeled = die.groupLabel != null
              ? RolledDie.copyWith(r, groupLabel: die.groupLabel)
              : r;
          return rescore?.call(relabeled) ?? relabeled;
        }),
      );
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
