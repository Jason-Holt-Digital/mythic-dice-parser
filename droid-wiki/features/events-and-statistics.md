# Events and statistics

Active contributors: Jason, Steve

## Purpose

The API can replay operation results to callbacks, repeat a parsed roll, and estimate a distribution from sampled totals. These features are defined in `lib/src/dice_expression.dart`, with statistical accumulation in `lib/src/stats.dart`.

## Result callbacks

```dart
final expression = DiceExpression.create(
  '2d6kh1',
  roller: PreRolledDiceRoller([2, 5]),
);
final summary = await expression.roll(
  onRoll: (result) => print(result.opType.name),
  onSummary: (result) => print(result.total),
);
print(summary.total); // 5
```

`DiceExpression.callListeners()` walks the **completed** result tree left, right, then parent, skipping `OpType.value` nodes. Each node goes to global listeners before the per-roll callback. After traversal, global summary listeners run before the per-roll summary callback.

These are post-evaluation observations, not animation lifecycle events. The AST's `call()` alone returns a result without the `roll()` listener/summary wrapper. Push in `lib/src/push.dart` constructs a new summary directly and does not call the expression's listeners.

`registerListener()` and `registerSummaryListener()` add callbacks to static lists shared across expressions. Clear them with `clearListeners()` and `clearSummaryListeners()` in tests or application teardown. Clearing result listeners also removes the initially installed default logger callback.

## Logging

The default result listener logs at FINE through the `DiceExpression` logger. `LoggingMixin` in `lib/src/utils.dart` gives AST and roller classes runtime-type loggers; evaluation logs at FINER and raw roller detail at FINEST. `example/main.dart` installs a root record subscriber and enables FINEST with `-v`.

No server log sink, metrics backend, or tracing system is configured. An embedding application chooses its own `package:logging` subscriptions.

## Repeated rolls and sampled statistics

```dart
final expression = DiceExpression.create('2d6');
await for (final summary in expression.rollN(5)) {
  print(summary.total);
}
final statistics = await expression.stats(num: 1000);
print(statistics['histogram']);
```

`rollN()` rolls sequentially and yields summaries as a stream. A stateful roller stays attached to the parsed expression: a pre-rolled queue needs enough values for every iteration, and a seeded RNG advances rather than resetting.

`StatsCollector` uses Welford's algorithm for the mean and population variance, plus a sorted histogram in `lib/src/stats.dart`. Output contains `mean`, `stddev`, `min`, `max`, `count`, and `histogram`; mean and deviation use three significant digits by default. The histogram can grow with the number of distinct totals.

This is Monte Carlo sampling, not an exact probability engine. The library default is 1,000 rolls. The [example CLI](example-cli.md) normally uses 10,000 in statistics mode and overrides its RNG choice with a fresh pseudo-random generator.

## Key abstractions and modification points

| Abstraction | Source | Change here for |
| --- | --- | --- |
| `DiceExpression` listener methods | `lib/src/dice_expression.dart` | Callback ordering and lifecycle |
| `rollN()` and `stats()` | `lib/src/dice_expression.dart` | Repeated evaluation and sampling |
| `StatsCollector` | `lib/src/stats.dart` | Accumulators, precision, histogram |
| `LoggingMixin` | `lib/src/utils.dart` | Logger naming |

Three principal files implement this capability. Jason and Steve appear in default-branch source history; tests share `test/dart_dice_parser_test.dart`, so the feature has no isolated test-to-code ratio.

## Key source files

| File | Purpose |
| --- | --- |
| `lib/src/dice_expression.dart` | Listener replay and repeated rolls |
| `lib/src/stats.dart` | Welford accumulator |
| `lib/src/utils.dart` | Lazy logger helper |
| `example/main.dart` | Verbose logging and sampled-statistics CLI |
| `test/dart_dice_parser_test.dart` | Listener and statistics tests |

See [Debugging](../how-to-contribute/debugging.md) for inspecting the result tree.
