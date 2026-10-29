# Configuration

The package has no environment file or server configuration layer. Its main settings are Dart package constraints, analyzer rules, injectable rollers, and formula tags.

## Package and development settings

| Setting | Value | Source |
| --- | --- | --- |
| Package | `mythic_dice_parser` 8.3.0 | `pubspec.yaml` |
| SDK | `^3.8.0` | `pubspec.yaml` |
| Publishing | `publish_to: none`; consumers use a git dependency pinned by `ref` | `pubspec.yaml` |
| Analyzer | Very Good Analysis, strict casts and raw types | `analysis_options.yaml` |
| Analyzer exclusions | `example/**` | `analysis_options.yaml` |
| Local tool pin | Dart 3.7, below the package minimum | `mise.toml` |
| Editor | Format on save/type, 80-column ruler | `.vscode/settings.json` |
| Launch profiles | Example programs, including an old-syntax profile | `.vscode/launch.json` |
| Workspace setup | Dependency upgrade and concurrent task commands | `.conductor/settings.toml` |
| Ignored generated files | Pub lockfile, tool/build output, coverage | `.gitignore` |

`CLAUDE.md` supplies repository guidance, but some inventory and dependency descriptions lag the actual configuration. See [Cleanup opportunities](../cleanup-opportunities.md).

## Runtime configuration

| Surface | Default or behavior | Source |
| --- | --- | --- |
| `DiceExpression.create(input, roller: ...)` | Secure RNG when omitted | `lib/src/dice_expression.dart`, `lib/src/dice_roller.dart` |
| `RNGRoller(Random(seed))` | Caller-selected reproducibility | `lib/src/dice_roller.dart` |
| Standard request limits | 0–1,000 dice; 2–100,000 sides | `lib/src/dice_roller.dart` |
| Repeat cap | 1,000 iterations per triggering die by default | `lib/src/dice_roller.dart`, `lib/src/ast_ops.dart` |
| Registered die types | Shared static registry; letters-only names | `lib/src/dice_expression.dart` |
| Result and summary listeners | Shared static callback lists; explicit clear methods | `lib/src/dice_expression.dart` |
| Sampling count | 1,000 library rolls by default | `lib/src/dice_expression.dart` |
| Statistics precision | Three significant digits for mean/deviation | `lib/src/stats.dart` |

Constants are not a global work budget, and callback-based rollers do not enforce the built-in range checks. See [Input boundaries](../security.md).

## Formula-level settings

`@push=N` declares a positive push budget for the whole roll. The minimum across the result tree wins. `@lock=s`, `sf`, or `none` controls per-die selection, with inner pool rules taking precedence. A caller-supplied `lockWhere` predicate overrides tag selection, but not existing locks or constant locking.

These rules live in `lib/src/parser.dart`, `lib/src/ast_core.dart`, `lib/src/push_lock.dart`, and `lib/src/push.dart`. `RollSummary.pushLimit` is informational; the caller must enforce it. Other tag keys remain metadata. See [Push](../features/push.md).

## Release configuration

| Setting | Value | Source |
| --- | --- | --- |
| Root component and strategy | `.`: `mythic_dice_parser`, `dart` | `release-please-config.json` |
| Changelog | `CHANGELOG.md` | `release-please-config.json` |
| Bootstrap SHA | `60347fad56132bd939adee0dc4f3243a7b8ced8f` | `release-please-config.json` |
| Tag format | `vVERSION`, no component prefix | `release-please-config.json` |
| Baseline | `.`: `8.3.0`, matching `pubspec.yaml` | `.release-please-manifest.json` |
| Trigger and target | Push to `main` or manual dispatch; job only on `refs/heads/main`; target `main` | `.github/workflows/release-please.yml` |
| Concurrency | `release-please`, `cancel-in-progress: false` | `.github/workflows/release-please.yml` |
| Credential | Required `RELEASE_PLEASE_TOKEN`; no `GITHUB_TOKEN` fallback | `.github/workflows/release-please.yml` |

The preflight verifies secret presence and repository read access only, not write permissions. `.github/RELEASES.md` specifies Contents, Pull requests, and Issues read/write token access. A matching earlier tag can take precedence over the bootstrap, so inspect the first release PR against the baseline. Release Please does not publish the package to a registry. See [Automation and publishing](../deployment.md) for the lifecycle and release verification.

## CI controls

The following names are referenced by checked-in workflows. Their configured values were not inspected:

| Name | Purpose |
| --- | --- |
| `FACTORY_API_KEY` | Factory workflow authentication |
| `FACTORY_WIKI_PR_TOKEN` | Optional wiki branch/PR token |
| `CODECOV_TOKEN` | Coverage upload authentication |
| `RELEASE_PLEASE_TOKEN` | Required repository-scoped release PR/release token; read-only preflight does not verify write scopes |
| `JHD_FACTORY_REVIEW_ENABLED` | Enable the new advisory review workflow |
| `JHD_FACTORY_MENTIONS_ENABLED` | Enable the new PR mention workflow |
| `JHD_FACTORY_TRIAGE_ENABLED` | Enable bounded issue triage |
| `JHD_FACTORY_STEWARD_ENABLED` | Enable the new Dart CI steward |
| `JHD_FACTORY_STEWARD_FIX_ENABLED` | Permit its optional auto-fix mode |

Source: `.github/workflows/dart.yml`, `.github/workflows/droid-wiki-refresh.yml`, `.github/workflows/factory-review.yml`, `.github/workflows/factory-mentions.yml`, `.github/workflows/factory-triage.yml`, `.github/workflows/factory-ci-steward.yml`, and `.github/workflows/release-please.yml`.

See [Automation and publishing](../deployment.md) for workflow behavior. No actual credentials were inspected.
