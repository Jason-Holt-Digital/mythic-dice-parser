# Getting started

Use Dart 3.8 or newer within the `^3.8.0` SDK range in `pubspec.yaml`. The package is pure Dart; Chrome is needed only for the browser test target.

## Prepare the checkout

Run from the repository root:

```bash
dart --version
dart pub upgrade --no-precompile
```

For a fresh clone, `README.md` gives this smoke test:

```bash
git clone https://github.com/Jason-Holt-Digital/mythic-dice-parser.git
cd mythic-dice-parser
dart pub upgrade --no-precompile
dart run example/main.dart -r 42 '2d6+4'
```

The seed repeats the roll. There is no build step or server to start, and local examples and VM tests need no environment variables, credentials, databases, or services.

`pubspec.yaml` declares the package as `mythic_dice_parser` and publishes to `https://glpub.dev/api/p/default/pub`. Configure access to that registry if your consuming project needs it. This repository does not document a registry authentication setup.

Do not rely on the Dart 3.7 pin in `mise.toml`: it is below the package's SDK minimum. The CI workflow `.github/workflows/dart.yml` installs the latest stable SDK instead.

## Roll deterministic dice

```dart
import 'package:mythic_dice_parser/mythic_dice_parser.dart';

Future<void> main() async {
  final expression = DiceExpression.create(
    '4d6kh3',
    roller: PreRolledDiceRoller([1, 3, 5, 6]),
  );
  final summary = await expression.roll();
  print(summary.total); // 14
  print(summary.results.map((die) => die.result).toList()); // [6, 5, 3]
  print(summary.discarded.map((die) => die.result).toList()); // [1]
}
```

`DiceExpression` lives in `lib/src/dice_expression.dart`; queued values and their range validation live in `lib/src/dice_roller.dart`. Always await `roll()`. Each result is a `RolledDie`, not an integer; read its `result` field.

Without an injected roller, the library uses secure randomness. To use a seeded generator, import `dart:math` and pass `roller: RNGRoller(Random(42))`.

## Run the examples

```bash
dart run --enable-asserts example/simple.dart
dart run example/main.dart -n 2 -o pretty '4d6kh3'
dart run example/main.dart -o json '"Attack": 2d6, "Damage": 1d8'
```

`example/simple.dart` demonstrates result-tree traversal with assertions. `example/main.dart` is a console example with plain, pretty, JSON, and simulation-statistics output, not an installed executable. See [Example CLI](../features/example-cli.md).

## Check a change

```bash
dart format --output=none --set-exit-if-changed .
dart analyze --fatal-infos .
dart test --platform vm
dart test --platform chrome
```

These are the checks in `.github/workflows/dart.yml`. The first three also appear in the VM verification sequence in `README.md`; Chrome is optional for local VM-only work. The format check does not modify files; run `dart format .` to apply fixes. `analysis_options.yaml` uses Very Good Analysis and excludes `example/**`, although formatting still covers the examples.

For the single-test smoke check documented in `README.md`:

```bash
dart test --platform vm test/dart_dice_parser_test.dart --plain-name 'arithmetic addition - 1+20'
```

For this wiki run, Dart was unavailable in the environment, so the commands above were inspected in configuration, not executed. See [Testing](../how-to-contribute/testing.md) for deterministic patterns and narrower targets.
