# Systems

Active contributors: Jason, Steve

## Purpose

The implementation has four main boundaries: parse notation, evaluate operations, produce dice values, and describe results. All live in the single package's `lib/src/` directory.

| System | Start here | Main source |
| --- | --- | --- |
| [Parser](parser.md) | Syntax, precedence, operand guards | `lib/src/parser.dart` |
| [Operators](operators.md) | Dice variants, arithmetic, modifiers | `lib/src/ast_core.dart`, `lib/src/ast_dice.dart`, `lib/src/ast_ops.dart` |
| [Rollers](rollers.md) | RNG and external input | `lib/src/dice_roller.dart` |
| [Results](results.md) | Immutable dice, trees, summaries | `lib/src/rolled_die.dart`, `lib/src/roll_result.dart`, `lib/src/roll_summary.dart` |

## Integration points

`lib/src/dice_expression.dart` connects these layers through `create()` and `roll()`. The public exports are in `lib/mythic_dice_parser.dart`; parser and AST implementation classes are not exported there.

The standalone [push feature](../features/push.md) uses the roller and result layers without rerunning the parser or modifier tree. Grouping, custom faces, and listener replay are described under [Features](../features/index.md).

## Key source files

| File | Purpose |
| --- | --- |
| `lib/mythic_dice_parser.dart` | Consumer-facing exports |
| `lib/src/dice_expression.dart` | Parse and evaluate entry point |
| `lib/src/enums.dart` | Die, operation, and count vocabulary |

The library has 18 Dart files, including the public barrel. Tests are shared across systems rather than split into one file per subsystem; see [Testing](../how-to-contribute/testing.md).
