# Features

Active contributors: Jason, Steve

## Purpose

Use these pages to find a capability before reading the implementation. The grammar and result model combine several game mechanics without requiring a game-specific engine.

| Capability | What to read | Implementation entry |
| --- | --- | --- |
| Dice notation and modifiers | [Parser](../systems/parser.md), [Operators](../systems/operators.md) | `lib/src/parser.dart`, `lib/src/ast_ops.dart` |
| Lock and reroll a pool | [Push](push.md) | `lib/src/push.dart` |
| Labeled pools and metadata | [Groups and tags](groups-and-tags.md) | `lib/src/ast_core.dart`, `lib/src/roll_summary.dart` |
| Named or nonstandard faces | [Custom dice](custom-dice.md) | `lib/src/dice_expression.dart`, `lib/src/ast_dice.dart` |
| Physical or asynchronous input | [Rollers](../systems/rollers.md) | `lib/src/dice_roller.dart` |
| Observe results and simulate distributions | [Events and statistics](events-and-statistics.md) | `lib/src/dice_expression.dart`, `lib/src/stats.dart` |
| Run formulas from a terminal | [Example CLI](example-cli.md) | `example/main.dart` |

## Integration points

Import `lib/mythic_dice_parser.dart` through its package URI. Applications decide how to display results, persist formulas, and enforce a summary's push limit. The checkout does not include a graphical dice runtime.

## Key source files

| File | Purpose |
| --- | --- |
| `lib/mythic_dice_parser.dart` | Public capability exports |
| `lib/src/dice_expression.dart` | Main API, named registry, listeners, repeated rolls |
| `lib/src/roll_summary.dart` | Final results, groups, and push state |

For architectural boundaries, see [Architecture](../overview/architecture.md).
