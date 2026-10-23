# Patterns and conventions

The library separates syntax, raw value production, and typed result interpretation. Preserve that separation when adding notation or integrating another dice source.

## Follow the active configuration

`pubspec.yaml` defines the package name, SDK constraint, and dependencies. `analysis_options.yaml` enables strict casts and raw types through Very Good Analysis. `CLAUDE.md` asks for 80-character formatting and fatal analyzer infos, but its references to the old barrel file, `lint`, version 8.2.0, and a single test file are stale. `AGENTS.md` records the approved coding principles below.

Use PascalCase for types, camelCase for members, and a leading underscore for private names. Run `dart format .`; do not hand-maintain spacing that the formatter will change.

## Approved coding principles

`AGENTS.md` holds five principles the maintainers approved for all changes:

- Validate unknown values once at the boundary that owns them, then pass typed values inward. Do not revalidate values a schema, constructor, or internal type already guarantees.
- Do not extract single-use helpers preemptively. Inline the logic at the call site unless the helper is reused, hides a genuinely complex boundary, or has a clear independent name.
- Before adding complexity for a speculative race or security edge case, explain the concrete failure mode, likelihood, and complexity cost, and get buy-in first.
- Test the actual implementation; do not duplicate logic into tests.
- Add comments for non-obvious constraints and surprising behavior, not for obvious assignments or control flow.

## Keep the layers separate

| Change | Start in | Preserve |
| --- | --- | --- |
| New notation | `lib/src/parser.dart` | Precedence and complete-input parsing |
| New operation | `lib/src/ast_core.dart`, `lib/src/ast_dice.dart`, `lib/src/ast_ops.dart` | Async child evaluation and result history |
| New value source | `lib/src/dice_roller.dart` | Raw stream contract, die type hints, extra-roll requests |
| New result state | `lib/src/rolled_die.dart` | Copy behavior, equality decisions, serialization policy |
| Push behavior | `lib/src/push.dart` | Per-die scoring, group identity, and constant locking |
| Public API | `lib/mythic_dice_parser.dart` | Explicit exports rather than implementation imports |

Operations return new snapshots. `lib/src/roll_result.dart` and `lib/src/group_result.dart` wrap iterables in `IList` and tags in unmodifiable maps. Do not mutate a previous summary during push.

## Async and error handling

`call()`, `eval()`, and `roll()` return futures. Custom rollers expose streams; callbacks may wait for a user, hardware, or another engine. Tests must await evaluation failures, since some invalid modifier targets are rejected only while rolling.

The parser and AST use `FormatException` for invalid notation or operations. Built-in rollers use `RangeError` for invalid ranges and supplied faces; queued input has its own exhaustion exception in `lib/src/dice_roller.dart`. Do not convert these into empty successful rolls.

## Equality and serialization are deliberate

`RolledDie.props` in `lib/src/rolled_die.dart` excludes provenance, scoring rules, and push-lock rules. Its JSON also excludes them. `RollResult` equality excludes child pointers; `RollSummary` equality includes push count and limit in `lib/src/roll_summary.dart`.

Adding a field does not automatically mean adding it to every equality or JSON representation. Decide whether it is observable state, internal evaluation context, or history. JSON omits many zero, false, empty, and null values and is not a complete in-memory snapshot.

## Test exact behavior

Use `PreRolledDiceRoller` for exact faces, especially modifier chains and pushes. Check totals, flags, active and discarded dice, groups, and JSON where relevant. `test/subtraction_push_test.dart` covers 8.3.0 boundaries; `test/parity_8_2_0_test.dart` records compatible behavior.

Reset named dice and global listeners when a test changes static state in `lib/src/dice_expression.dart`. Do not assume a scoring operator preserves result order: `CountOp` in `lib/src/ast_ops.dart` places matching dice first.

See [Testing](testing.md), [Parser](../systems/parser.md), and [Results](../systems/results.md).
