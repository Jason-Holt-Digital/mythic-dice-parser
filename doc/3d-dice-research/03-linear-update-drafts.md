# Linear Update Drafts: Mythic Dice Parser 3D Dice Direction

## Purpose

These drafts are intended for Linear project and issue updates. They are not a
full research transcript. They should give the team a clear, opinionated map of
the direction without importing model deliberation, excessive code examples, or
contradictory framing.

Use the source docs only for deeper evidence:

- [01-stable-facsimile-fallback-control-path.md](01-stable-facsimile-fallback-control-path.md)
- [02-flutter-scene-first-bold-path.md](02-flutter-scene-first-bold-path.md)

## Editorial Rules For Linear

- Keep Linear text decisive and useful for coordination.
- Show that there are two pathways, but do not average them into a weak middle.
- Mark the current first experiment clearly: Flutter Scene-first.
- Treat the stable facsimile path as a fallback/control path, not the chosen
  first experiment.
- Avoid model-thinking language such as "I would pivot" or "the revised bet is."
- Avoid long code examples in Linear. Include names, paths, acceptance criteria,
  and decision gates instead.
- Each Linear artifact should have one job:
  - project: overall product direction,
  - parent issue: shared module and lifecycle contract,
  - research issue: rendering/simulation paths and experiment decision.

## Project-Level Draft

Target: Mythic Dice Parser project description.

```markdown
Mythic Dice Parser is the shared dice rolling system for Mythic, Tome Keeper,
Loom & Legends, and future apps.

The project is not limited to dice notation parsing. It owns the shared roll
lifecycle by default: parsing, roll authority, visible 3D overlay rolls,
modifier/special-effect mapping, structured `RollSummary` outcomes, and the
consumer-app integration contract.

Current direction:

- Build the first 3D dice experiment as a Flutter Scene-first spike in
  `example/dice_scene_experiment/`.
- Keep the root Dart package pure while the renderer experiment proves or
  breaks the real 3D path.
- Use RNG-authoritative kinematic settle first: the Scene roller awaits visual
  settle, then yields authoritative values through `DiceRoller`, and
  `DiceExpression.roll()` returns the real `RollSummary`.
- Require a real d6 scene object before the spike is considered successful:
  `.glb` preferred, programmatic six-face scene mesh acceptable,
  `CuboidGeometry` smoke-only.
- Preserve a physics runway through explicit face mapping, `DiceWorld`,
  `DiceBody`, `RollAuthority`, and future simulator contracts.

The secondary path is a stable Flutter facsimile renderer using core Flutter
rendering tools. It remains valuable as a fallback/control path if Flutter
Scene hits a documented blocker in the toolchain, asset pipeline, overlay
composition, target platform, face mapping, or lifecycle integration.
```

## MYT-1345 Parent Issue Draft

Target: MYT-1345 description or a top comment.

```markdown
This parent issue anchors Mythic Dice Parser as the shared dice rolling system
used across Mythic, Tome Keeper, Loom & Legends, and future apps.

The shared module should own the roll lifecycle by default:

- parse and evaluate dice expressions,
- request or determine authoritative dice values,
- display visible 3D overlay rolls above consumer app UI,
- map modifiers and special effects into visual state,
- emit structured `RollSummary` / `RolledDie` outcomes,
- expose controlled extension points for consumer apps without making each app
  own the core dice behavior.

Research direction:

- The first experiment is Flutter Scene-first, isolated under
  `example/dice_scene_experiment/`.
- The root package remains pure Dart until the renderer/lifecycle contract is
  proven.
- The first roll mode is RNG-authoritative kinematic settle: values are
  authoritative before emission, dice visually settle on those values, then the
  custom roller yields parser values and `DiceExpression.roll()` returns the
  real result.
- The acceptance target is a real d6 scene object: `.glb` preferred,
  programmatic six-face scene mesh acceptable, `CuboidGeometry` smoke-only.
- Physics remains a first-class runway. The first experiment does not begin
  with physics-authoritative dice, but the design must preserve face mapping,
  body pose, settle orientation, and later simulator integration.

Two renderer paths remain tracked:

1. Flutter Scene-first path: chosen first experiment. This tests whether a real
   Flutter-native 3D scene graph can carry the shared roll lifecycle.
2. Stable facsimile path: fallback/control path using stable Flutter rendering
   if Flutter Scene hits a documented blocker in the toolchain, asset pipeline,
   overlay composition, target platform, face mapping, or lifecycle
   integration.

This issue should stay focused on the shared system contract. Implementation
sub-issues should cover the Flutter Scene experiment, stable facsimile fallback,
face mapping, overlay lifecycle, and physics authority spike separately.
```

## MYT-1349 Research Issue Draft

Target: MYT-1349 description update or research summary comment.

```markdown
Research outcome: the first rendering experiment is Flutter Scene-first.

The purpose of MYT-1349 is to determine whether Mythic Dice Parser can own a
real 3D overlay roll while preserving authoritative structured outcomes for
consumer apps.

Chosen first path:

- Create `example/dice_scene_experiment/`.
- Use Flutter Scene as the first renderer under test.
- Isolate Flutter Scene, Flutter master, Native Assets/DataAssets, and renderer
  dependencies from the root package.
- Keep the root package pure Dart.
- Implement `SceneOverlayDiceRoller extends DiceRoller`; use
  `CallbackDiceRoller` only as a temporary adapter if it accelerates a smoke
  test.
- Start with RNG-authoritative kinematic settle.
- Render one or more d6 scene objects in a Flutter `OverlayEntry`.
- Animate dice through Flutter Scene and settle them on authoritative faces.
- Yield authoritative values only after visual settle, so
  `DiceExpression.roll()` returns the real `RollSummary` after the overlay
  resolves.

Acceptance gate:

- The app is attempted on Chrome and at least one native target. Success or
  failure is documented per target, including exact Flutter revision, flags,
  and failure mode.
- `Scene.initializeStaticResources()` completes before scene construction.
- A `SceneView` renders nonblank content inside a bounded, non-opaque
  `OverlayEntry` above visible app UI.
- `1d6` and `2d6` standard polyhedral d6 rolls visibly animate.
- Final visible face matches the authoritative value emitted to the parser.
- `summary.results.map((die) => die.result)`, `RollSummary.total`,
  `discarded`, `groups`, and count metadata are checked against the expression.
- A real d6 scene object is used before success is claimed: `.glb` preferred,
  programmatic six-face scene mesh acceptable, `CuboidGeometry` smoke-only.
- The experiment documents exact Flutter revision, Flutter Scene version,
  build flags, asset pipeline behavior, screenshots, and platform failures.
- Phase 1 visual support is d6-only. Fudge, D66, percentile, named dice, and
  `d[...]` custom faces remain parser-supported but require later visual
  mappings.
- Tags are group-level metadata in the current parser; visual tag styling
  should be derived from `RollSummary.groups[label].tags`, not from individual
  `RolledDie` objects.

Secondary path:

The stable Flutter facsimile path remains tracked as fallback/control:

- use stable Flutter overlay/rendering tools,
- animate projected dice or cube-like bodies,
- settle visuals onto authoritative values,
- validate the same `RollSummary` integration,
- do not implement this path unless the Flutter Scene spike fails a documented
  gate or a control renderer is explicitly needed for comparison.

Do not blend these paths. Flutter Scene is the first experiment. The stable
facsimile path is a fallback/control path with its own clear acceptance
criteria.
```

## Suggested Follow-Up Issues

These are candidates to create after the project and parent issue are updated.
Do not create them without explicit confirmation.

### Build Flutter Scene 3D Dice Experiment

```markdown
Create `example/dice_scene_experiment/` and prove that Mythic Dice Parser can
trigger a real Flutter Scene 3D overlay roll and emit an authoritative
`RollSummary`.

Acceptance:

- Flutter Scene app is isolated under `example/dice_scene_experiment/`.
- Root package remains pure Dart.
- Toolchain setup is documented, including Flutter master revision and flags.
- `Scene.initializeStaticResources()` and `SceneView` render nonblank.
- Overlay appears above visible app UI and cleans up after completion.
- `DiceExpression.create('1d6', roller: sceneOverlayRoller)` works.
- `await dice.roll()` waits for visual completion.
- d6 final face matches emitted value.
- `RollSummary` output is displayed after overlay resolution.
- Phase 1 visual support is explicitly limited to standard polyhedral d6
  rolls.
```

### Implement D6 Face Mapping For Scene Dice

```markdown
Define deterministic d6 face mapping for scene dice.

Acceptance:

- Values 1-6 map to explicit local face normals.
- Each value maps to a deterministic settle orientation.
- Each settle orientation maps back to the same top face.
- Tests prove `topFaceForOrientation(orientationForTopFace(value)) == value`
  for all d6 values.
- Mapping convention is documented for the d6 scene asset.
```

### Add Real D6 Scene Asset To Experiment

```markdown
Add a real d6 scene object to the Flutter Scene experiment.

Acceptance:

- `CuboidGeometry` remains only a smoke test.
- Experiment uses either `d6_authority.glb` or a programmatic six-face scene
  mesh with real face material/texture mapping.
- Asset origin, scale, face orientation, and face-value mapping are documented.
- The same asset can be instantiated for `2d6`.
- Final visible face matches the authoritative emitted value.
```

### Track Stable Flutter Facsimile Fallback

```markdown
Keep the stable Flutter facsimile renderer as a fallback/control path.

Acceptance:

- Document how the stable path would implement overlay lifecycle, dice body
  pose, face mapping, and authoritative value emission.
- Keep acceptance criteria parallel to the Flutter Scene experiment.
- Do not implement unless Flutter Scene fails a documented gate or a control
  renderer is explicitly needed for comparison.
```

### Physics Authority Spike

```markdown
Explore physics-authoritative dice after the Flutter Scene renderer/lifecycle
bridge works.

Acceptance:

- One d6 body can fall or roll in a tray.
- Settled body orientation can be inspected.
- Top face is computed from the same face mapping used by the hybrid path.
- Physics result can be fed into Mythic Dice Parser through the `DiceRoller`
  contract.
- Spike documents whether the viable path is Flutter Scene physics, Rapier,
  Bullet, Jolt, or another simulator adapter.
```

## What Not To Put In Linear

- Long pasted model transcripts.
- "Yes, I would pivot..." or similar conversational reasoning.
- Large starter-code blocks.
- Unsupported claims that a technology is production-ready.
- Conflicting language inside a single path, such as calling Flutter Scene both
  the selected first path and merely a later optional renderer.
- Treating 3D dice as polish, app-only UI, or future fallback.
