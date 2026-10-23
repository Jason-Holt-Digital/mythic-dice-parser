# Cleanup opportunities

These are verified maintenance opportunities from this checkout, not changes made during wiki generation. Start with documentation and configuration drift before attempting broader refactors.

## Align the SDK declaration

`mise.toml` pins Dart 3.7, while `pubspec.yaml` requires `^3.8.0`. A developer who follows the pin cannot satisfy the package constraint. Align the local tool declaration with a supported SDK and verify the format/analyze/test workflow.

## Refresh older API examples

| Location | Observed drift | Useful correction |
| --- | --- | --- |
| `README.md` | Older synchronous `roll()` examples, integer result JSON, upstream badges and issue links | Use awaited 8.3.0 examples and typed die output; distinguish upstream links |
| `CLAUDE.md` | Version 8.2.0, old barrel name, `lint`, single-suite description | Match `pubspec.yaml`, `lib/mythic_dice_parser.dart`, Very Good Analysis, and three suites |
| `lib/mythic_dice_parser.dart` | Introductory example assigns `roll()` to an integer | Show awaited `RollSummary` |
| `lib/src/ast_core.dart` | `LabelOp.toString()` and comments put the colon inside the quotes | Align displayed notation with the actual parser syntax |
| `lib/src/group_result.dart`, `lib/src/rolled_die.dart` | Label examples use the old spelling | Use `"Name":` |
| `.vscode/launch.json` | Includes an explicitly named old explosion syntax profile | Remove or clearly retain as a negative-test profile |

The label mismatch affects more than a comment: rendered expressions should not be assumed to round-trip into the parser. Add a focused test before changing normalization.

## Separate test and operator concerns carefully

`test/dart_dice_parser_test.dart` combines arithmetic, syntax errors, rollers, groups, push, scoring, tags, and review regressions. The two newer suites already isolate subtraction/push and compatibility fixtures. Further splitting could make targeted runs and ownership clearer without changing behavior.

`lib/src/ast_ops.dart` holds all modifier families, and `lib/src/ast_core.dart` contains both identity-preserving and totalized comma modes. Splitting those modes at parse time could reduce runtime ambiguity, but it is not a small mechanical cleanup: labels can exist only on discarded dice, and compatibility behavior must remain covered.

`foldSubtractions()` mutates AST folding state in `lib/src/ast_core.dart`. Any operator refactor must preserve the 8.3.0 rule that a die is subtracted at most once and that die-reading operators see legacy folded constants.

## Revisit the clamp TODO

`lib/src/ast_ops.dart` has `TODO(mythic): add clamped flag?` inside `ClampOp`. Existing `clampCeiling` and `clampFloor` flags are already represented by `lib/src/rolled_die.dart`; clarify the intended missing behavior before adding another field.

No dependency freshness claim is made here: `pubspec.yaml` records constraints, but no package-registry audit or resolved lockfile was available for this documentation run.

See [By the numbers](by-the-numbers.md) for measured sizes and churn, and [Testing](how-to-contribute/testing.md) for regression coverage.
