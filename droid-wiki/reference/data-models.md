# Data models

The public API is exported by `lib/mythic_dice_parser.dart`. Results are immutable snapshots with structured fields, not the older integer arrays and free-form metadata maps shown in some upstream examples.

## Main public types

| Type or function | Source | Contract |
| --- | --- | --- |
| `DiceExpression` | `lib/src/dice_expression.dart` | Parse, roll, repeat, sample, register dice, manage callbacks |
| `DiceRoller` | `lib/src/dice_roller.dart` | Stream raw faces for numeric or custom-face requests |
| `RNGRoller` | `lib/src/dice_roller.dart` | Random-backed value source |
| `PreRolledDiceRoller` | `lib/src/dice_roller.dart` | Queued integer values with validation |
| `CallbackDiceRoller` | `lib/src/dice_roller.dart` | Async application callbacks |
| `PreRolledDiceRollerExhaustedException` | `lib/src/dice_roller.dart` | Queue exhaustion |
| `DiceResultRoller` | `lib/src/dice_roller.dart` | Raw-to-typed adapter; exported with its source file |
| `RolledDie` | `lib/src/rolled_die.dart` | Individual result and its state |
| `RollResult` | `lib/src/roll_result.dart` | One evaluated operation and child results |
| `RollSummary` | `lib/src/roll_summary.dart` | Final roll-level view |
| `GroupResult` | `lib/src/group_result.dart` | One labeled pool |
| `DieScoreRule` | `lib/src/die_score_rule.dart` | Count type, comparison, optional target |
| `PushLock` | `lib/src/push_lock.dart` | Success, success/failure, or no-score lock |
| `reroll()`, `rerollableDice()` | `lib/src/push.dart` | Push execution and replacement selection |
| `RolledDieIListExtensions` | `lib/src/extensions.dart` | Sum and score-count getters |
| `pprint()` | `lib/src/roll_result.dart` | Indented result-tree rendering |

## Result shapes

### Rolled die

`RolledDie` in `lib/src/rolled_die.dart` records `result`, `dieType`, `nsides`, `potentialValues`, and min/max potential values. Factories cover polyhedral, fudge, D66, and synthetic single-value results.

Flags describe discarded, scored, exploded, compounded, penetrated, rerolled, clamped, totaled, locked, and subtracted states. `groupLabel` carries pool identity. `from` retains provenance; `scoreRules` and `pushLock` retain rules needed for later pushes.

For a subtracted die, `result` is negated. `isMaxResult` compares the displayed face, while summary score counts exclude subtracted dice through `lib/src/extensions.dart`.

### Operation result

`RollResult` in `lib/src/roll_result.dart` holds `expression`, `opType`, active `results`, `discarded`, optional `tags`, and `left`/`right` child pointers. Totals and score counts are computed getters. Arithmetic operators return new results rather than modifying either operand.

### Summary

`RollSummary` in `lib/src/roll_summary.dart` keeps the detailed root plus final results, discarded dice, total, score counts, expression, optional groups, `pushCount`, and optional `pushLimit`. The constructor derives these values from the tree.

`groups` is null without labeled dice. If labels exist, unlabeled dice share the empty-string key. The map is unmodifiable, and all-discarded labeled groups can remain present.

### Group

`GroupResult` in `lib/src/group_result.dart` contains a label, active and discarded immutable lists, and optional unmodifiable tags. Total and score counts are lazy getters, not stored equality fields.

## Enum vocabulary

| Enum | Values or role | Source |
| --- | --- | --- |
| `DieType` | `polyhedral`, `fudge`, `d66`, `nvals`, `singleVal` | `lib/src/enums.dart` |
| `OpType` | Values, arithmetic, dice, modifiers, comma, total | `lib/src/enums.dart` |
| `CountType` | Count, success, failure, critical success/failure | `lib/src/enums.dart` |
| `CountComparison` | Equal, less, less-or-equal, greater, greater-or-equal | `lib/src/enums.dart` |
| `PushLock` | `successes`, `successesAndFailures`, `none` | `lib/src/push_lock.dart` |

## Equality and JSON

| Model | Equality caveat | JSON caveat |
| --- | --- | --- |
| `RolledDie` | Omits `from`, `scoreRules`, `pushLock` | Omits the same context; false/zero/empty/null fields removed |
| `RollResult` | Omits child pointers | Recursively includes non-value children; drops empty and zero fields |
| `RollSummary` | Includes `pushCount` and `pushLimit`, not the detailed tree itself | Includes detailed results and groups; drops empty/default fields |
| `GroupResult` | Uses label, lists, tags; not derived getters | Emits derived totals/counts only when nonzero |

These policies are implemented in the corresponding source files. There is no provided `fromJson()` API. Serialization is useful for display and inspection, but it cannot reconstruct all in-memory push behavior by itself.

For control flow and examples, see [Results](../systems/results.md), [Groups and tags](../features/groups-and-tags.md), and [Push](../features/push.md).
