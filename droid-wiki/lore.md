# Lore

This history follows the complete Git ancestry reachable from `5143708` on 2026-10-23. Dates below are recorded commit dates, not inferred publication dates. `CHANGELOG.md` supplies version labels and migration details; the locally present annotated tags anchor only `v8.0.1` and `v8.1.0`. For current behavior, prefer [Architecture](overview/architecture.md) and [Push](features/push.md) over historical descriptions.

## Seven eras

### 1. 2017-11-27 to 2018-10-02: the first parser and Dart 2

The repository begins with `4743a69` on **2017-11-27**. Later that day, `99ca729` adds the parser, roller and sample CLI: PetitParser expression groups already recognize ordinary dice, `dF`, parentheses, multiplication, addition and subtraction. Parsing and evaluation are coupled through attached parser actions in the historical [lib/src/dice_parser.dart](https://github.com/Jason-Holt-Digital/mythic-dice-parser/blob/99ca729/lib/src/dice_parser.dart).

`68e5ed5` on **2017-12-01** changes the roller output toward individual-roll information, recorded as 0.1.0 in `CHANGELOG.md`. `f968163` on **2018-10-02** is the Dart 2 / 0.2.0 upgrade. The old `DiceParser` class is gone, but notation parsing and a separate roller remain central in `lib/src/parser.dart` and `lib/src/dice_roller.dart`.

### 2. 2019-05-21 to 2020-07-11: a wider dice vocabulary and streaming statistics

`904446e` on **2019-06-05** adds percentile and D66 dice and omitted dice-count syntax. `3be8e96` that day gets drop-high/low working. `80a6069` on **2019-06-06** adds exploding dice, more drop comparisons, counting and clamp/cap operations.

Statistics arrive in `428ee67` on **2019-06-06**. On **2019-06-15**, `f69ba9e` replaces the external Stats-package calculation with a Welford accumulator and changes `rollN` into an async generator. The current `lib/src/stats.dart` still uses that online mean/variance update and a histogram. This does **not** mean expression evaluation itself was fully async in 2019.

`b2da273` on **2020-02-21** records version 2.0.0; the adjacent `f8b15b4` downgrades PetitParser, also recorded in `CHANGELOG.md`. The history does not support treating that dependency adjustment as a new dice engine.

### 3. 2022-10-09 to 2022-12-07: null safety, an AST and operator revisions

`964dfaa` on **2022-10-09** starts the recorded null-safety work. The **2022-10-14** sequence `5680a03`, `8ece1ce` and `d6b2773` separates parser construction from rolling and removes the original [lib/src/dice_parser.dart](https://github.com/Jason-Holt-Digital/mythic-dice-parser/blob/99ca729/lib/src/dice_parser.dart). `CHANGELOG.md` calls this the 4.0.0 AST transition.

Syntax is not continuous across this period:

- `a5aa99c`, **2022-10-12**, removes subtraction in 3.1.0; `86e75b4`, **2022-10-19**, restores it.
- `e8b1201`, **2022-10-24**, adds keep-high/low and compounding, moves explosion behavior into the AST, changes exploding syntax from `2d!6` to `2d6!`, and reassigns `!!` from limited explosion to compounding. `f56106f` that day adds reroll notation.
- `b5ab9cc`, **2022-10-27**, adds once-only forms and the success/failure/critical counting vocabulary.
- `86876b0` removes the binary-tree result representation on **2022-10-28**; `339baba` restores it the same day. The current `lib/src/roll_result.dart` still exposes `left` and `right`.

The CI transition is similarly explicit: `d5a6575` adds GitHub Actions and `3a4fd14` removes CircleCI on **2022-10-14**. See [Automation and publishing](deployment.md).

### 4. 2023-10-03 to 2025-03-18: Dart 3 and the richer result graph

`d41e59f` on **2023-10-04** upgrades to Dart 3. `8fd5430` on **2024-11-11** changes the listener API and result graph; the 7.0.0 changelog describes a `RollSummary` containing the evaluation tree.

On **2024-11-13**, `2066c33` makes counting the lowest-precedence operation for 7.0.3. This historical rule matters because 8.3.0 later changes it again. A Flutter demo added by `b93e5fa` that day is removed by `6d462b1` the same day; the current repository is not that app.

`cad641c` on **2024-12-27** adds inline face-list dice, now represented by `CSVDice` in `lib/src/ast_dice.dart`, with syntax such as `2d[2,3,5,7]`. `928cc20` and `c50285f` on **2025-03-18** record a Dart upgrade and analysis fix.

### 5. 2026-02-15 to 2026-03-23: the async Mythic architecture

`33a3e3d` on **2026-02-15**, “Sync parser baseline to MythicGME2e,” is the large structural transition: separate `lib/src/ast_core.dart`, `lib/src/ast_dice.dart` and `lib/src/ast_ops.dart`, rich `RolledDie` objects, async `call()`/`roll()`, and pluggable stream-based rollers. The old [lib/src/ast.dart](https://github.com/Jason-Holt-Digital/mythic-dice-parser/blob/33a3e3d/lib/src/ast.dart) and [lib/src/results.dart](https://github.com/Jason-Holt-Digital/mythic-dice-parser/blob/33a3e3d/lib/src/results.dart) temporarily remain alongside their replacements. `6a53d09` on **2026-02-16** touches that legacy implementation; its commit title should not be mistaken for the first appearance of the new roller abstraction.

The dated `doc/architecture-spec.md` records the **2026-03-15** conversion plan. Implementation commits that day include:

- `da19965`: remove the obsolete [lib/src/ast.dart](https://github.com/Jason-Holt-Digital/mythic-dice-parser/blob/33a3e3d/lib/src/ast.dart) and [lib/src/results.dart](https://github.com/Jason-Holt-Digital/mythic-dice-parser/blob/33a3e3d/lib/src/results.dart), and fix summary-listener clearing.
- `8943cf9`: groups, labels, tags and the named die registry.
- `604f59c`: standalone push/reroll.
- `11e2f37`: lowercase named dice to avoid the built-in `dF` / `D66` parser conflict.

The sequence merges in `b0132d7` on **2026-03-16**. The 8.0.0 entry in `CHANGELOG.md` describes the async, immutable result/API break. On **2026-03-23**, `24968a8` renames the package and barrel to `mythic_dice_parser` and switches analysis configuration to Very Good Analysis; `92f2ac5` follows with lint fixes.

### 6. 2026-06-12 to 2026-08-29: research documents and changing repository tooling

`2911501` and `b98e9e3` on **2026-06-12** add the legacy Droid mention/review workflows. `8eacf73` on **2026-06-28** adds the 3D-dice research direction, now under `doc/3d-dice-research/`.

Those documents are proposals, not evidence that a Flutter 3D runtime shipped in this package. The current tree has no `example/dice_scene_experiment/` application. See [Design background](background.md).

Repository-local agent tooling is added through late June and July, then removed in `364ca01` on **2026-08-04** and `96fd814` on **2026-08-29**. That is tooling history, not removal of the parser or push features.

### 7. 2026-09-29 to 2026-10-23: push semantics become more explicit

The September/October sequence is directly visible in `CHANGELOG.md`, `lib/src/parser.dart`, `lib/src/push.dart`, `lib/src/die_score_rule.dart`, `lib/src/push_lock.dart` and the tests:

| Date | Evidence | Change |
| --- | --- | --- |
| 2026-09-29 | `72bf078`, `50c1a5c`, `1d7f205`; tag `v8.0.1` points to `8211244` | Reject dangling binary operators and empty operands while accepting signed operands |
| 2026-09-29 | `e7f1af1`, `pubspec.yaml` | Change publishing configuration to GLPub |
| 2026-10-01; merge/tag on 2026-10-02 | `3547d1a`; `v8.1.0` points to `cfd8720` | Record per-die scoring rules and score replacement dice during a push |
| 2026-10-20 | `5f8b94e`, `a1e8ec3`, `d3ef2e6` | 8.2.0 formula-level `@push` / `@lock`, scoped locks, serialized push state and equality fixes |
| 2026-10-22 | `442eb38`, `cbd0df5`, `4a8acad` | 8.3.0 pushes both sides of subtraction; count targets become signed integer literals and count/sort precedence changes |
| 2026-10-23 | `5143708` | Add native Factory delivery workflows and wiki refresh automation |

Only the two tags listed above are present locally. The 8.2.0 and 8.3.0 dates here are implementation-commit dates, not invented tag or registry publication dates.

## Old features that still survive

The oldest surviving behavior is older than its current class/file layout. To give a reproducible change count without pretending to identify every semantic modification, the table counts **non-merge commits whose `lib/` diff adds or removes a line matching the stated regular expression**, using `git log HEAD --no-merges -G '<pattern>' -- lib/`. These counts include introductions, removals, moves and formatting of matching lines; unrelated lines can change without increasing the count.

| Surviving feature | First evidenced implementation | Current source anchors | Text-change commits through HEAD | Pattern |
| --- | --- | --- | ---: | --- |
| Ordinary dice and Fudge dice | `99ca729`, 2017-11-27 | `lib/src/parser.dart`, `lib/src/ast_dice.dart`, `lib/src/dice_roller.dart` | 49 for the Fudge vocabulary | `Fudge\|fudge\|dF` |
| D66 and percentile dice | `904446e`, 2019-06-05 | `lib/src/ast_dice.dart`, `lib/src/dice_roller.dart` | 22 | `D66\|d66\|d%` |
| Welford statistics | `f69ba9e`, 2019-06-15 | `lib/src/stats.dart`, `lib/src/dice_expression.dart` | 6 | `welford\|Welford\|Statsimator\|StatsCollector` |

The escaped pipes above render regular-expression alternation inside a Markdown table. The original parser and CLI predate the AST. Separately, `git log --follow --no-merges` finds **41 file-touch commits** for `lib/src/dice_roller.dart` and **46** for `example/main.dart`, both tracing to `99ca729`. These are file-history proxies, not counts of feature rewrites.

## Replacements and removals worth remembering

| Date / commit | Retired or replaced behavior | Current reference |
| --- | --- | --- |
| 2019-06-15, `f69ba9e` | External Stats-package computation replaced by an online accumulator | `lib/src/stats.dart` |
| 2022-10-14, `d6b2773` | Action-based `DiceParser` implementation removed after the parse/evaluate split | `lib/src/parser.dart`, `lib/src/dice_expression.dart` |
| 2022-10-24, `e8b1201` | `2d!6` explosion spelling and old meaning of `!!` replaced | `lib/src/ast_ops.dart`, `CHANGELOG.md` 5.0.0 |
| 2024-11-13, `6d462b1` | `dice_parser_demo/` Flutter app removed | `CHANGELOG.md` 7.0.2; current `example/` contains CLI examples |
| 2026-03-15, `da19965` | Duplicate legacy AST / result files deleted | `lib/src/ast_core.dart`, `lib/src/ast_dice.dart`, `lib/src/ast_ops.dart`, result files |
| 2026-03-23, `24968a8` | `dart_dice_parser` package/barrel naming replaced | `pubspec.yaml`, `lib/mythic_dice_parser.dart` |
| 2026-10-01, `3547d1a` | “Pushed replacement dice are not scored” limitation removed | `lib/src/die_score_rule.dart`, `lib/src/push.dart` |
| 2026-10-22, `442eb38` | Arithmetic-expression count targets and lowest-priority counting replaced by literal targets and tighter binding | `lib/src/parser.dart`, `CHANGELOG.md` 8.3.0 |

## Growth was not monotonic

These are physical-line snapshots of **Dart files under `lib/` and `test/` at each listed revision**, including comments and blanks. Each historical revision has its own tracked-file inventory; deleted files are included while they existed. Generated wiki content is excluded.

| Revision date | Commit | Library files / lines | Test files / lines |
| --- | --- | ---: | ---: |
| 2017-11-27 | `99ca729` | 3 / 100 | 1 / 78 |
| 2019-06-15 | `f69ba9e` | 3 / 481 | 1 / 297 |
| 2022-10-14 | `d6b2773` | 6 / 572 | 1 / 147 |
| 2024-12-27 | `cad641c` | 8 / 1,673 | 1 / 844 |
| 2026-02-15 | `33a3e3d` | 16 / 3,684 | 1 / 1,162 |
| 2026-03-16 | `b0132d7` | 16 / 2,878 | 1 / 1,743 |
| 2026-10-23 | `5143708` | 18 / 3,449 | 3 / 3,006 |

The February spike includes the legacy files later deleted by `da19965`: **789 lines of the legacy AST file and 413 of the legacy results file**. A smaller later library is therefore not evidence of lost functionality. Likewise, line totals alone do not measure test coverage. See [By the numbers](by-the-numbers.md) for the current-cohort activity and churn methodology.

## Reading the evidence

Commit IDs above can be inspected with `git show <id>` in this repository. `CHANGELOG.md` is useful for version semantics but generally lacks dates, so Git supplies the dates. `doc/architecture-spec.md`, `doc/implementation-plans.md` and `doc/spec-validation-report.md` are March design/validation snapshots, not a substitute for the current source. This account records observable changes without inferring undocumented motives.
