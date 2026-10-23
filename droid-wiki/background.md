# Design background

The repository preserves design documents from several stages of the fork. They explain intent, but some described APIs were never implemented in the proposed form or have since changed. Use current source for the contract.

## March 2026 conversion

`doc/architecture-spec.md`, dated March 15, 2026, planned the conversion from upstream integer and synchronous results to typed asynchronous dice, grouping, and push. `doc/spec-validation-report.md` records that several “current limitations” in the draft were already resolved even then.

The practical separation is still visible: the roller produces raw values, AST operations interpret them, and results describe what happened. The draft's exact names and signatures are not reliable current API documentation.

| Historical proposal | Current source behavior |
| --- | --- |
| Future-based roller batches and `rollCustomFaces()` | Stream-based `roll()` and `rollVals()` in `lib/src/dice_roller.dart` |
| `RollOutcome` result name | `RollSummary` in `lib/src/roll_summary.dart` |
| Result-object `reroll()` method | Standalone function in `lib/src/push.dart` |
| PetitParser 6 compatibility discussion | `^7.0.2` in `pubspec.yaml` |
| Labels shown as `"Attack:"` | Parser requires `"Attack":` in `lib/src/parser.dart` |
| Example named identifiers with underscores | Registry permits letters only in `lib/src/dice_expression.dart` |
| Tags as uninterpreted metadata only | `push` and `lock` interpreted by `lib/src/parser.dart`, `lib/src/ast_core.dart`, and `lib/src/roll_summary.dart` |

`doc/implementation-plans.md` contains staged diffs and later fixes. Its existing-vs-planned descriptions should be read with their historical context, not copied into current code without inspection.

## Why die identity matters

`lib/src/rolled_die.dart` carries each die's type, faces, flags, label, scoring rules, and push-lock rule. That lets heterogeneous dice explode according to their own faces and allows a pushed replacement to keep the scoring of the die it replaces.

`CommaOp` in `lib/src/ast_core.dart` has a compatibility split: unlabeled comma operands become totals, while labeled dice preserve identity. Runtime detection must inspect discarded dice too, or an entirely dropped group can silently switch modes.

Push rules evolved further in the 8.1.0 to 8.3.0 entries of `CHANGELOG.md`. Current push behavior reapplies only recorded scoring, lets formula tags choose locks, and preserves subtracted dice where compatibility permits. See [Push](features/push.md).

## June 2026 3D direction

`doc/3d-dice-research/00-3d-dice-direction-index.md` chooses a Flutter Scene-first experiment while keeping the root Dart package pure. The research compares a stable facsimile path with a more ambitious scene-based overlay and calls out tension with the older “client owns rendering” boundary.

| Research document | Role |
| --- | --- |
| `doc/3d-dice-research/00-3d-dice-direction-index.md` | Direction and proposed runtime responsibilities |
| `doc/3d-dice-research/01-stable-facsimile-fallback-control-path.md` | Fallback/control approach |
| `doc/3d-dice-research/02-flutter-scene-first-bold-path.md` | Chosen experiment plan and risks |
| `doc/3d-dice-research/03-linear-update-drafts.md` | Draft coordination text, not implementation |
| `doc/3d-dice-research/gpt-55-pro-3d-dice-experiment-research-prompt.md` | Research prompt and constraints |

The proposed `example/dice_scene_experiment/` is absent from this checkout. There is no shipped Flutter scene, overlay, physics simulator, or graphical capture target. The current integration seam is [Rollers](systems/rollers.md); the proposed ownership shift remains design work.

For a dated repository narrative rather than technical rationale, see [Lore](lore.md).
