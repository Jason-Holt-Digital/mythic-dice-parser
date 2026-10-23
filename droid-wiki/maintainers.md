# Maintainers

This is a historical contact map, **not** formal ownership or a list of required reviewers. No `CODEOWNERS` file was found. Names and dates come from non-bot author history and representative blame, with automation and README history refreshed on `origin/main` at `9eb77e7`. Unchanged runtime subsystem rows retain the earlier evidence.

Use [Contributing](how-to-contribute/index.md) for the contribution process and [Systems](systems/index.md) to locate the relevant code.

## Human contacts by area

Only two human names were established across the major shared subsystems: Jason and Steve. Jason is the recent fork contact; Steve is the historical upstream contact. Historical involvement does not establish present availability or repository permissions.

Dates below are the latest matching authored commit for each listed person within that row's paths, not individual contribution metrics.

| Area and repository paths | Recent fork contact | Historical upstream contact |
| --- | --- | --- |
| Parser and operators: `lib/src/parser.dart`, `lib/src/ast_core.dart`, `lib/src/ast_dice.dart`, `lib/src/ast_ops.dart` | Jason, 2026-10-22 | Steve, 2024-12-27 |
| Roller input: `lib/src/dice_roller.dart` | Jason, 2026-03-23 | Steve, 2024-12-27 |
| Results, expression events, statistics: `lib/src/roll_result.dart`, `lib/src/roll_summary.dart`, `lib/src/rolled_die.dart`, `lib/src/dice_expression.dart`, `lib/src/stats.dart` | Jason, 2026-10-22 | Steve, 2024-11-13 |
| Tests: `test/` | Jason, 2026-10-22 | Steve, 2025-03-18 |
| Examples: `example/` | Jason, 2026-03-23 | Steve, 2024-11-13 |
| Tooling and automation: `.github/`, `pubspec.yaml`, `analysis_options.yaml`, `mise.toml` | Jason, 2026-10-23 | Steve, 2025-03-18 |

For [push](features/push.md), `lib/src/push.dart`, `lib/src/push_lock.dart`, and `lib/src/die_score_rule.dart` establish Jason as the human contact, last active there on 2026-10-22. Steve provides upstream result/operator context, but no direct authorship of these push files was established. Do not treat him as a push owner.

For `doc/`, Jason is the established human contact, last active there on 2026-06-28. The historical specifications and proposed experiments are distinguished in [Design background](background.md).

For release automation and setup documentation, current default-branch history establishes Jason as the human contact on 2026-10-23: `.github/RELEASES.md`, `.github/workflows/release-please.yml`, `release-please-config.json`, `.release-please-manifest.json`, and `README.md`. This is historical attribution, not evidence of access to release credentials. See [Automation and publishing](deployment.md).

## Evidence and limits

- `4a8acad` records Jason's signed count-target fix on 2026-10-22.
- `442eb38` records Jason's subtraction/push and count-literal work on 2026-10-22.
- `cad641c` records Steve's explicit face-value notation work on 2024-12-27.
- `c50285f` records Steve's test analysis fix on 2025-03-18.
- `5143708` records Jason's delivery automation change on 2026-10-23.
- `60347fa` records Jason's fresh-clone setup and local verification documentation on 2026-10-23.
- `bfbfc93` records Jason's Release Please configuration on 2026-10-23.
- `9eb77e7` records Jason's removal of legacy Droid workflows on 2026-10-23.
- Representative blame retains both human histories in `lib/src/parser.dart`, `lib/src/dice_roller.dart`, `test/dart_dice_parser_test.dart`, and `example/main.dart`. The current `.github/workflows/dart.yml` blame is Steve's.

Automated authors are excluded from human contacts. Git attribution alone does not establish approval authority, an on-call rotation, response-time commitments, or access to publishing credentials. Where only one human is evidenced for newer work, this page states that gap rather than inventing additional owners.
