# Debugging

Reduce a failure to notation plus exact input faces before changing the implementation. [Testing](testing.md) explains the deterministic fixtures; the [architecture](../overview/architecture.md) identifies the responsible layer.

## Inspect the result tree

```dart
final expression = DiceExpression.create(
  '2d6+3',
  roller: PreRolledDiceRoller([6, 1]),
);
final summary = await expression.roll(
  onRoll: (node) => print('${node.opType}: $node'),
);
print(summary.toStringPretty());
```

Import the public API from `package:mythic_dice_parser/mythic_dice_parser.dart`. Inspect `summary.detailedResults`, its `left`/`right` children, and both `results` and `discarded`. The pretty tree helps locate where a pool became a synthetic total or where flags changed.

`onRoll` is **not** a live roller-progress callback. `lib/src/dice_expression.dart` awaits complete AST evaluation, then walks non-value result nodes left/right/parent and dispatches listeners. It cannot prompt for a die before evaluation completes. Use `CallbackDiceRoller` for on-demand external input; see [Rollers](../systems/rollers.md) and [Events and statistics](../features/events-and-statistics.md).

## Enable logging

The default result listener logs at `Level.FINE`; the typed roller adapter logs requests/results at `Level.FINEST`. Configure both the logger level and a record subscriber:

```dart
Logger.root.level = Level.FINEST;
final subscription = Logger.root.onRecord.listen(
  (record) => print('${record.loggerName}: ${record.message}'),
);
// Reproduce and inspect the output, then:
await subscription.cancel();
```

This snippet also requires `package:logging/logging.dart`. Clearing global result listeners removes the default `FINE` logger; restore it if needed. The example CLI enables `FINEST` with `-v`:

```sh
dart run --enable-asserts example/main.dart -v -r 1234 -o pretty '4d6kh3'
```

See [Example CLI](../features/example-cli.md). Use queued faces for exact request-order diagnostics, rather than relying only on a random seed.

## Common failures

| Symptom | What to check |
| --- | --- |
| `FormatException` during creation | Inspect the source position and [grammar](../systems/parser.md). Labels use `"Attack": 2d6`; named die references are lowercase. Empty operands and dangling arithmetic are invalid. |
| Wrong count scope | `2d6+1d6#` applies `#` only to `1d6`. Parenthesize the combined pool. Targets are signed integer literals, so `4d10#>=6+2` adds two to the count. |
| Keep after count fails to parse | Use `(2d20 #cf #cs)kh`, not `2d20 #cf #cs kh`. Count and sort can interleave. |
| Queue exhaustion | Supply enough faces for every request, including modifier extras and D66 digits. A consumed queue does not reset when the same expression rolls again. Await the error from `roll()`. |
| `RangeError` while rolling | Pre-rolled values must match the requested range or allowed face list. A d6 cannot accept 7; inline/named faces are actual values, not face indexes. |
| Callback input behaves unexpectedly | Inspect requested count, sides, minimum, and die type. Callback results are trusted; validate returned count and allowed values in the client. |
| Expected group disappears | Inspect discarded dice too. Labels and tags can belong to an all-discarded pool; unlabeled comma expressions totalize instead of preserving pools. |
| Push does not reapply a modifier | Push reuses recorded scoring only, not the AST's explode/drop/clamp/sort operations. Inspect `rerollableDice` before consuming new input. |
| Push ignores a declared budget | `@push` is exposed through `pushLimit`; the caller must enforce the budget. `reroll()` does not enforce it. |
| A subtracted success is not counted | RHS faces are negated for totals and marked `subtracted`; replacement scoring happens on the positive face, while summary counts exclude subtracted dice. |
| Push after JSON loses scoring | JSON omits `scoreRules`, provenance, and push-lock predicates. There is no supported complete state round trip. |

For lock defaults, scoped overrides, already-locked dice, and non-pushable synthetic totals, use [Push](../features/push.md). For group/tag inspection, use [Groups and tags](../features/groups-and-tags.md).

## Key source files

| Path | Debugging role |
| --- | --- |
| `lib/src/dice_expression.dart` | Parse entry, evaluation, listener timing |
| `lib/src/dice_roller.dart` | Input validation, exhaustion, detailed request logs |
| `lib/src/utils.dart` | Runtime-type logger names |
| `lib/src/roll_summary.dart`, `lib/src/roll_result.dart` | Summary and detailed tree output |
| `example/main.dart` | Verbose and pretty CLI output |
| `test/subtraction_push_test.dart` | Exact sign, scoring, and precedence regressions |
