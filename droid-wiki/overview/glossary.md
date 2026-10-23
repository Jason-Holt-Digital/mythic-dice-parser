# Glossary

These terms describe the library's notation, evaluation model, and push mechanic. Source paths identify the implementation rather than older names used in upstream documentation.

| Term | Meaning | Source |
| --- | --- | --- |
| Dice expression | A parsed, callable formula; `roll()` returns a future summary | `lib/src/dice_expression.dart` |
| AST | Operation tree built by PetitParser before any dice are rolled | `lib/src/parser.dart` |
| Dice operator | Async AST node derived from `DiceOp` | `lib/src/ast_core.dart` |
| Roller | A provider of raw face values through streams | `lib/src/dice_roller.dart` |
| Result roller | Adapter that wraps raw values into typed dice and results | `lib/src/dice_roller.dart` |
| Rolled die | Immutable face, die type, flags, label, provenance, and push rules | `lib/src/rolled_die.dart` |
| Result tree | `RollResult` nodes with child pointers describing evaluation | `lib/src/roll_result.dart` |
| Summary | Final dice, totals, scores, groups, and push state | `lib/src/roll_summary.dart` |
| Discarded | Dice retained for inspection but excluded from the active sum | `lib/src/roll_result.dart` |
| Labeled group | Dice associated with `"Name": expression`, including discarded dice | `lib/src/group_result.dart` |
| Tag | `@key=value` metadata; `push` and `lock` have defined semantics | `lib/src/parser.dart`, `lib/src/ast_core.dart` |
| Plain count | `#` replaces a dice list with one synthetic count | `lib/src/ast_ops.dart` |
| Scoring count | `#s`, `#f`, `#cs`, or `#cf` marks dice without replacing them with a count | `lib/src/ast_ops.dart` |
| Score rule | Recorded comparison reapplied to a die's replacement on push | `lib/src/die_score_rule.dart` |
| Push | Standalone `reroll()` of unlocked active dice from an existing summary | `lib/src/push.dart` |
| Push lock | Per-die rule chosen by `@lock=s`, `sf`, or `none` | `lib/src/push_lock.dart` |
| Push limit | Smallest `@push=N` in the result tree; caller-enforced budget | `lib/src/roll_summary.dart` |
| Subtracted die | Right-side die with negated `result` and `subtracted: true` | `lib/src/roll_result.dart` |
| Folded subtraction | Right-side dice collapsed to one negative constant for compatibility | `lib/src/ast_core.dart` |
| Exploding | Add another die when a face matches the explosion trigger | `lib/src/ast_ops.dart` |
| Compounding | Add triggered extra rolls into the original die's final value | `lib/src/ast_ops.dart` |
| Penetrating | Sum triggered rolls, subtracting one per additional roll | `lib/src/ast_dice.dart` |
| D66 | Two d6 values interpreted as tens and ones, not a 66-sided die | `lib/src/dice_roller.dart` |
| Named die | Registered lowercase name referring to a list of numeric faces | `lib/src/dice_expression.dart` |
| Synthetic constant | A `singleVal` result from a literal or totalization; never pushed | `lib/src/rolled_die.dart`, `lib/src/push.dart` |

Continue with [Architecture](architecture.md) or the [Data models](../reference/data-models.md).
