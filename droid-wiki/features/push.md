# Push
Active contributors: Jason

## Purpose

A push replaces selected active dice from a previous `RollSummary`, preserving locked dice and constants. It runs **below the AST**, not by evaluating the original formula again. Each replacement inherits the scoring rules of the exact die it replaces, making multiple pools with different thresholds safe to push together.

## Key abstractions

| Abstraction | Responsibility | Source |
|---|---|---|
| `rerollableDice()` | Plan which current dice a push would replace, in result order | `lib/src/push.dart` |
| `reroll()` | Replace eligible dice and return a new summary | `lib/src/push.dart` |
| `PushLock` | Interpret `@lock=s`, `sf`, and `none` | `lib/src/push_lock.dart` |
| `DieScoreRule` | Reapply one recorded scoring comparison | `lib/src/die_score_rule.dart` |
| `RolledDie.scoreRules` | Carry pool-specific scoring across copies and pushes | `lib/src/rolled_die.dart` |
| `RollSummary.pushCount`, `pushLimit` | Expose push history and formula budget | `lib/src/roll_summary.dart` |

```mermaid
flowchart LR
    Summary[Previous summary] --> Budget[Caller checks budget]
    Budget --> Plan[rerollableDice]
    Plan --> Input[Obtain replacement faces]
    Input --> Push[reroll]
    Push --> Score[Score raw replacement faces]
    Score --> Sign[Restore subtraction signs]
    Sign --> Next[New summary and history link]
```

## Lock policy and budget

A die is kept if any of these applies:

1. It already has `locked: true`.
2. Its type is `singleVal`, or it has `totaled: true`.
3. The caller's `lockWhere` returns true.
4. Without a caller predicate, its recorded `@lock` policy keeps it.

No recorded policy defaults to `PushLock.successes`. `@lock=s` keeps ordinary or critical successes. `@lock=sf` also keeps ordinary or critical failures. `@lock=none` disables score-based locking, but cannot unlock constants or previously locked dice.

Policies use scoring **flags**, not face values: an unscored six is not automatically a success. A caller predicate replaces the tag/default predicate rather than combining with it. The innermost pool tag wins over an enclosing tag because `TagOp` only stamps dice that lack a policy.

`@push=N` requires a positive integer. The summary finds the smallest limit across the tree; no tag means `null`, or unlimited by formula. Repeated keys within one consecutive tag run use the last value, while nested limits preserve the smaller value.

**`reroll()` does not enforce the budget.** Check `pushCount < pushLimit` when a limit exists, and separately check whether the planner returns any dice. Even pushing an all-locked summary returns a new summary with an incremented count.

## Deterministic example

This example matches the both-side subtraction regression in `test/subtraction_push_test.dart`:

```dart
import 'package:mythic_dice_parser/mythic_dice_parser.dart';

Future<void> main() async {
  final initial = await DiceExpression.create(
    '(2d6#s6 - 2d6#s6) @push=1',
    roller: PreRolledDiceRoller([6, 2, 3, 4]),
  ).roll();

  final limit = initial.pushLimit;
  if (limit != null && initial.pushCount >= limit) return;
  if (rerollableDice(initial).isEmpty) return;

  final pushed = await reroll(
    initial,
    roller: PreRolledDiceRoller([5, 6, 1]),
  );
  print(pushed.total); // 4
  print(pushed.successCount); // 1
  print(pushed.pushCount); // 1
}
```

The initial active contributions are `[6, 2, -3, -4]`, totaling one. The six is a success, so the planner returns `[2, -3, -4]`. Replacements become `[5, -6, -1]`, leaving final contributions `[6, 5, -6, -1]`. The RHS six is scored as a success before negation but is excluded from `successCount`. Its success flag still makes it eligible for locking on the next push.

For physical or rendered dice, call the planner first and roll replacements in exactly that order with the original die types. Pass the **same** `lockWhere` to planning and execution. Supply actual positive polyhedral faces to the queued roller even when replacing subtracted dice; push restores their signs.

## What gets replayed

Each scoring operator records a `DieScoreRule` on every die it inspected, including nonmatches. Rules are applied to fresh replacements in recorded order and carried forward. A five can be a success in a `#s>=5` pool but not in a `#s6` pool of the same size. No scoring operator means no replacement scoring.

Only scoring is replayed. Push does not run clamp, keep/drop, explode, compound, notation reroll, or sort again. A replacement may therefore fall below an old clamp or show an explosion trigger without creating another die. Previously discarded dice stay discarded.

Copies retain rules; newly created explosion dice only acquire rules from scoring operators above their creation. Rules are not inferred from another die with the same face or size. This is why rebuilding a pool from numeric values loses important behavior.

Multiplication, aggregates, plain counts, and unlabeled comma totals leave synthetic constants, so those outcomes cannot be pushed. Labeled comma groups retain individual dice. Ordinary subtraction preserves both sides, but nested and die-reading subtraction can fold RHS outcomes into constants; see [Operators](../systems/operators.md).

## History and integration limits

Kept dice are copied with `locked: true`; replaced active dice are appended to discarded history. The new result has `OpType.reroll`, an expression ending in `(push)`, and the old detailed tree as its left child. This preserves tag harvesting and push limits while incrementing `pushCount`; the input summary remains unchanged.

Push constructs a summary directly, so it does not invoke `DiceExpression.roll()` listeners. Treat external UI events as application responsibilities. Replacement input follows the [roller contract](../systems/rollers.md); callbacks do not automatically validate count or range.

`scoreRules`, `pushLock`, and provenance are omitted from die JSON and equality. JSON export is not resumable push state; see [Results](../systems/results.md).

## Scope snapshot

The three push implementation files below contain 205 physical lines. Their `origin/main` current-path history has one unique human author, excluding automated authors and without rename following. The shared three-file `test/*.dart` corpus contains 3,006 physical lines: an overlapping 14.66:1 test-to-source ratio, not push-only coverage. Counts include comments and blanks at `5143708`.

## Key source files

| File | Start here for |
|---|---|
| `lib/src/push.dart` | Eligibility, replacements, history, scoring |
| `lib/src/push_lock.dart` | Exact tag values and lock predicates |
| `lib/src/die_score_rule.dart` | Target defaults and comparisons |
| `test/subtraction_push_test.dart` | Both-side push and count-literal regressions |
| `test/dart_dice_parser_test.dart` | Pool-specific rules, scope, budgets, multi-push |
