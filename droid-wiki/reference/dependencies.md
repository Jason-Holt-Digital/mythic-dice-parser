# Dependencies

`pubspec.yaml` declares five direct runtime dependencies and five direct development dependencies, 10 in total. The versions below are constraints, not resolved versions; `pubspec.lock` is ignored by `.gitignore`.

## Runtime packages

| Package | Constraint | Purpose and example source |
| --- | --- | --- |
| `collection` | `^1.0.0` | Collection comparison/min-max helpers in `lib/src/rolled_die.dart`, `lib/src/roll_summary.dart` |
| `equatable` | `^2.0.0` | Value equality in `lib/src/roll_result.dart`, `lib/src/die_score_rule.dart` |
| `fast_immutable_collections` | `^11.0.0` | Immutable dice lists in `lib/src/rolled_die.dart`, `lib/src/group_result.dart` |
| `logging` | `^1.3.0` | Result and operation logs in `lib/src/dice_expression.dart`, `lib/src/utils.dart` |
| `petitparser` | `^7.0.2` | Expression grammar in `lib/src/parser.dart` |

There are no Flutter, database, HTTP client, or physics-engine dependencies in the manifest.

## Development packages

| Package | Constraint | Purpose |
| --- | --- | --- |
| `args` | `^2.0.0` | Argument parsing in `example/main.dart` |
| `io` | `^1.0.0` | CLI exit codes in `example/main.dart` |
| `mocktail` | `^1.0.0` | Mocked random generator in `test/dart_dice_parser_test.dart` |
| `test` | `^1.0.0` | VM and browser test framework |
| `very_good_analysis` | `^10.0.0` | Analyzer rules included by `analysis_options.yaml` |

## External tooling

`.github/workflows/dart.yml` installs the Dart SDK, activates the coverage package globally, and uploads coverage through Codecov. Coverage is a CI-installed tool, not a declared direct dependency.

Factory automation, wiki publishing, and Release Please use GitHub Actions rather than Dart dependencies. The native Factory workflows pin action revisions. `.github/workflows/release-please.yml` pins `googleapis/release-please-action` to `45996ed1f6d02564a971a2fa1b5860e934307cf7` (v5.0.0); its Dart strategy does not add a Dart package dependency or a package publisher. See [Automation and publishing](../deployment.md).

No package freshness or vulnerability scan ran for this wiki. To investigate dependency changes, resolve them with the supported SDK and rerun the [test workflow](../how-to-contribute/testing.md), rather than interpreting broad constraints as currently installed versions.
