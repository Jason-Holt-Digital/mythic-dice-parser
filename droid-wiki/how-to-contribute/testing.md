# Testing

Tests use `package:test` with no bespoke harness. Match the affected layer described in [Systems](../systems/index.md), then add a deterministic regression.

## Suite map

| File | Coverage and fixtures |
| --- | --- |
| `test/dart_dice_parser_test.dart` | Main grammar, dice, modifiers, metadata, listeners, groups, tags, named types, push, and immutability suite; seeded RNG, `MockRandom`, and queued faces |
| `test/parity_8_2_0_test.dart` | Recorded 8.2.0 totals and four score counts using a fresh `Random(1234)` per formula; intentionally changed 8.3.0 interpretations are excluded |
| `test/subtraction_push_test.dart` | Exact subtraction/push dice, flags, locks, labels, signed count targets, and count/keep precedence |

Parity fixtures protect selected legacy outcomes, not full result-tree or JSON equivalence. Do not change their expected values merely to silence a failure: first decide whether behavior is an intentional compatibility change.

## Run narrowly, then broadly

Run from the repository root:

```sh
dart test --platform vm test/subtraction_push_test.dart
dart test --platform vm test/dart_dice_parser_test.dart --name 'externally-rolled dice'
dart test --platform vm test/parity_8_2_0_test.dart
dart test --platform vm
dart test --platform chrome
```

Chrome tests need an available Chrome browser. Running only the VM suite does not validate the browser target. CI runs both.

## Choose deterministic input

Prefer `PreRolledDiceRoller` for exact transformation and push behavior:

```dart
test('queued faces preserve the arithmetic constant', () async {
  final summary = await DiceExpression.create(
    '2d6+3',
    roller: PreRolledDiceRoller([6, 1]),
  ).roll();

  expect(summary.total, 10);
  expect(
    summary.results.where((d) => d.nsides == 6).map((d) => d.result),
    [6, 1],
  );
});
```

Use imports from `package:mythic_dice_parser/mythic_dice_parser.dart` and `package:test/test.dart`.

The main suite's `MockRandom` returns `1` from `nextInt`, producing face `2` for an ordinary die because faces are one-based. `Random(1234)` supports repeatable compatibility fixtures; recreate it for each independent case. Queue consumption follows evaluation requests: explosions, compounding, rerolls, and D66 can require extra inputs. See [Rollers](../systems/rollers.md).

For ordered behavior, assert the exact sequence. The main suite's helper parameter `verifyResultOrder` is counterintuitive: its default/true branch uses `unorderedEquals`, while false uses `equals`. Prefer explicit matchers in new tests.

## Assert errors at the right time

Parsing in `DiceExpression.create()` is synchronous:

```dart
expect(() => DiceExpression.create('2d6+'), throwsFormatException);
```

Evaluation and roller streams fail asynchronously:

```dart
final expression = DiceExpression.create(
  '3d6',
  roller: PreRolledDiceRoller([1, 2]),
);
await expectLater(
  expression.roll(),
  throwsA(isA<PreRolledDiceRollerExhaustedException>()),
);
```

Use the same awaited pattern for evaluation-time range errors. Clean up any static named-die registrations and global listeners a test changes; restore listeners when clearing them removes the default logger.

## Regression checklist

- Grammar changes: accepted and rejected inputs, signed literal targets, and parentheses.
- Count scope: `2d6+1d6#` counts only the right pool; `(2d6+1d6)#` counts the combined pool. Count/sort bind before arithmetic, can interleave, and keep after count needs parentheses.
- Push changes: inspect `rerollableDice`, locks, group labels, scoring flags, `subtracted`, and repeated pushes. A total alone can hide a sign or score error.
- Metadata changes: inspect kept and discarded dice, all-discarded groups, and the detailed result tree.
- Serialization changes: assert omission behavior; JSON is not a complete push-state round trip.

See [Parser](../systems/parser.md), [Push](../features/push.md), and [Data models](../reference/data-models.md) for contracts.

## Examples and coverage

Examples contain useful assertions and must be run with them enabled:

```sh
dart run --enable-asserts example/simple.dart
dart run --enable-asserts example/main.dart -n 10 -o pretty '(3d6 + 3d6! + 3d6!!) #cs #cf #s #f'
```

CI's coverage commands are:

```sh
dart pub global activate coverage
dart pub global run coverage:test_with_coverage --branch-coverage
```

`coverage` is globally activated, not a sixth development dependency in `pubspec.yaml`. `codecov.yml` only ignores `dice_parser_demo`; it does not define a percentage threshold. Upload details are in [Automation and publishing](../deployment.md).
