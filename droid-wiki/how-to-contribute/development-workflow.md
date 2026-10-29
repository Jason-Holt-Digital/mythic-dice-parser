# Development workflow

This is a recommended local edit/check/review loop. `CONTRIBUTING.md` does not impose a branching or pull-request policy. See [Contributing](index.md) for the documented community expectations.

## Prepare the toolchain

Use an SDK satisfying `pubspec.yaml`: Dart `^3.8.0`. The `mise.toml` pin is `3.7`, below that minimum; do not assume the pin can resolve this package. CI uses stable Dart. See [Tooling](tooling.md) for the configuration map.

From the repository root, install or refresh dependencies using the same command as CI:

```sh
dart pub upgrade --no-precompile
```

Dependency installation is a developer setup step, not something performed while generating these docs. No resolved lockfile is committed, so record the SDK and resolution when investigating a machine-specific failure.

## Edit in a small loop

1. Start from the intended base and use a focused working branch if appropriate for your contribution.
2. Reproduce with queued input and add a targeted test.
3. Change the responsible layer. A new grammar rule belongs in `lib/src/parser.dart`; roller requests and push scoring have separate contracts.
4. Run a narrow [test command](testing.md), then format and analyze.

```sh
dart test --platform vm test/subtraction_push_test.dart
dart format .
dart format --output=none --set-exit-if-changed .
dart analyze --fatal-infos .
```

`analysis_options.yaml` excludes `example/**`, but the repository-wide format command still covers examples. Run examples explicitly rather than treating an analysis pass as proof they work.

## Before requesting review

Run the full validation sequence when the environment supports it:

```sh
dart test --platform vm
dart test --platform chrome
dart run --enable-asserts example/simple.dart
dart run --enable-asserts example/main.dart -n 10 -o pretty '(3d6 + 3d6! + 3d6!!) #cs #cf #s #f'
```

Review the diff for unrelated formatting, dependency, and generated-file changes. Describe any intentional incompatibility, especially [count precedence](../systems/parser.md) or [push behavior](../features/push.md), and report missing local checks honestly.

For release-worthy work, follow `.github/RELEASES.md`: use `fix:` or `feat:` in commits and the final squash title. Mark breaking changes with `!` after the type or a `BREAKING CHANGE:` footer. `chore:` alone does not trigger a release. Release Please manages the release PR, version, changelog, and `vVERSION` tag on `main`; it does not publish the package to a registry. Consumers pick up a release by bumping the `ref` of their git dependency.

The checked-in CI sequence also collects coverage; see [Testing](testing.md). Workflow triggers, Factory automation, and release boundaries live in [Automation and publishing](../deployment.md), rather than being duplicated here.

## Documentation and source drift

Use the actual public barrel `lib/mythic_dice_parser.dart` and `pubspec.yaml` over stale names or tool descriptions in `CLAUDE.md` and `README.md`. Historical design documents explain intent but are not executable specifications. See [Cleanup opportunities](../cleanup-opportunities.md).

## Key source files

| Path | Role |
| --- | --- |
| `pubspec.yaml`, `mise.toml` | SDK requirement and mismatched local pin |
| `analysis_options.yaml` | Strict analysis and exclusions |
| `.github/workflows/dart.yml` | Validation commands |
| `.github/RELEASES.md` | Release conventions and verification |
| `.conductor/settings.toml` | Optional local task shortcuts |
| `CHANGELOG.md` | Compatibility history |
