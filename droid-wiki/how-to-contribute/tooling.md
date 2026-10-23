# Tooling

The development toolchain is Dart plus standard formatter, analyzer, and test commands. Begin with [Development workflow](development-workflow.md); workflow permissions and delivery automation are covered in [Automation and publishing](../deployment.md).

## Configuration map

| Path | Actual configuration |
| --- | --- |
| `pubspec.yaml` | Package `mythic_dice_parser` 8.3.0, SDK `^3.8.0`, five runtime and five development dependencies |
| `analysis_options.yaml` | `package:very_good_analysis/analysis_options.yaml`, strict casts/raw types, excludes `example/**` |
| `mise.toml` | Dart `3.7`, below the package SDK minimum |
| `.github/workflows/dart.yml` | Stable Dart validation, VM/Chrome tests, assertion-enabled examples, global branch-coverage collection |
| `.github/workflows/release-please.yml` | Main-only release PR and GitHub release automation; requires `RELEASE_PLEASE_TOKEN` |
| `release-please-config.json`, `.release-please-manifest.json` | One root Dart component, 8.3.0 baseline, bootstrap SHA, and `vVERSION` tags |
| `codecov.yml` | Ignore entry for `dice_parser_demo` |
| `.vscode/settings.json` | Format on save/type, 80-column guide, final newline and editor preferences |
| `.vscode/launch.json` | Example launch profiles, including verbose dice runs and a profile explicitly named old syntax |
| `.conductor/settings.toml` | Dependency setup and concurrent local tasks for tests, analysis, format check, and simple example |

The linter is `very_good_analysis ^10.0.0`, not the older `lint` package described in `CLAUDE.md`. Examples remain outside analyzer coverage. The 80-column editor guide is a convention; use `dart format` as the executable formatting check.

## Core commands

Run these from the repository root:

```sh
dart pub upgrade --no-precompile
dart format --output=none --set-exit-if-changed .
dart analyze --fatal-infos .
dart test --platform vm
dart test --platform chrome
```

Use `dart format .` when you intend to modify formatting. Chrome is an additional test runtime, not a Flutter target. The CLI under `example/main.dart` is an example program, not a declared installed executable.

The development dependencies are `args`, `io`, `mocktail`, `test`, and `very_good_analysis`. Coverage is activated globally by CI. See [Dependencies](../reference/dependencies.md) for runtime libraries and [Testing](testing.md) for narrow tests, assertions, and coverage commands.

## Optional editor and task support

VS Code and Conductor files are convenience wrappers, not required infrastructure. Check the notation before using older launch profiles: the profile named `explode - old syntax` contains `10d!4`, while current exploding syntax is `10d4!`. Prefer the commands and syntax verified against current source.

Conductor's setup runs `dart pub upgrade --no-precompile`; its default run task is VM tests. Its other tasks mirror existing analyzer, formatter, Chrome, and assertion-enabled example commands.

## Automation boundary

The seven checked-in workflows comprise Dart validation, wiki refresh, four gated native Factory workflows, and Release Please. Release Please uses the Dart strategy, starts from an 8.3.0 manifest baseline, and requires `RELEASE_PLEASE_TOKEN` without a built-in-token fallback. Its preflight checks only that the secret exists and can read the repository, not write permissions. It does not automate GLPub publication. Consult [Automation and publishing](../deployment.md) for bootstrap and release verification.

No Dart SDK was available during this wiki generation. Documentation/link checks were possible; formatter, analyzer, VM/Chrome tests, and examples were not executed. The commands above are sourced from configuration, not reported as passing runs.
