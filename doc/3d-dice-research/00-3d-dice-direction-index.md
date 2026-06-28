# Mythic Dice Parser 3D Dice Research

## Working Rule: Do Not Average Responses

This research track is intentionally opinionated. Do not average competing
answers into a cautious middle position. Preserve strong claims, compare them
against evidence, and choose a direction. If two responses conflict, resolve
the conflict explicitly rather than watering down both positions.

Bias: boldness over caution. Risks should be named precisely and designed
through. The output of this research should be executable architecture and an
experiment plan, not a generic list of options.

## Source Documents

- First response: captured below in this document.
- GPT Pro response and stable fallback/control path:
  [01-stable-facsimile-fallback-control-path.md](01-stable-facsimile-fallback-control-path.md).
- Bold path / chosen first experiment:
  [02-flutter-scene-first-bold-path.md](02-flutter-scene-first-bold-path.md).
- Linear-ready update draft:
  [03-linear-update-drafts.md](03-linear-update-drafts.md).

## Chosen First Path: Flutter Scene First

Decision: the first experiment is **Flutter Scene first**, not stable
facsimile first.

We are changing the constraint from stable-first to truth-first. The root Dart
package stays pure, but the first renderer spike should be an intentionally
experimental Flutter Scene app under:

```text
example/dice_scene_experiment/
```

The experiment should prove or break the real product bet:

> Mythic Dice Parser can trigger a real Flutter Scene 3D overlay roll, animate
> one or more real d6 scene nodes, land them on authoritative values, and emit
> a real `RollSummary`.

This is not a compromise position and not a generic renderer abstraction. The
first renderer under test is Flutter Scene. If it fails, the failure should be
specific: toolchain, asset pipeline, web backend, overlay compositing, face
mapping, or physics runway.

Immediate decisions:

- Use `example/dice_scene_experiment/`.
- Keep the root package pure Dart.
- Use RNG-authoritative kinematic settle first, with a hybrid-ready body and
  face-mapping model.
- Require a real d6 scene object before calling the spike successful: `.glb`
  preferred, programmatic six-face scene mesh acceptable.
- Use `CuboidGeometry` only as a smoke test.
- Keep physics on the same runway, but not Phase 1.

## First Response

### Bottom Line

Mythic Dice Parser is not just a dice notation parser with visuals attached.
It should become the shared dice system for Mythic, Tome Keeper, Loom &
Legends, and future apps. That means the package should own the roll lifecycle
by default, including visible 3D overlay rolls, structured authoritative
outcomes, rules metadata, and consumer integration.

The current package is already a strong rules and result engine. It is not yet
a true shared 3D dice system.

### What Exists

Grounded in the current repo and attached issue context:

- MYT-1345 defines this as the central shared dice roller and integration
  contract issue, covering the module, example app, visualization, and
  extensions.
- The canonical language says Mythic Dice Parser owns the roll lifecycle by
  default; overlay rolls are 3D presentations above existing UI; visible rolls
  are required; RNG-first is acceptable only if the architecture remains
  physics-ready.
- The package already supports async rolling, `DiceRoller`, `RNGRoller`,
  `PreRolledDiceRoller`, `CallbackDiceRoller`, groups, tags, named dice,
  structured `RolledDie`, and push/reroll.
- Local VM tests passed: `dart test --platform vm` completed with 248 passing
  tests.

### Important Conflict

`doc/architecture-spec.md` is stale for the current canonical direction. It
still frames rendering and animation as client-app responsibilities, while the
canonical language moves visualization expectations and default roll lifecycle
ownership into Mythic Dice Parser.

The old boundary should be replaced. Consumer apps should integrate through the
shared contract and extension points, not own the core roll lifecycle or 3D dice
behavior.

### What Is Missing

The missing layer is an owned 3D roll runtime:

- `RollLifecycle`: state machine from request to prepare dice, animate or
  simulate, settle, apply modifiers/effects, and emit `RollSummary`.
- `DiceWorld`: overlay scene, camera, lights, table/collision bounds, dice
  registry, simulation clock.
- `DiceBody`: geometry, material, transform, velocity, `RolledDie` identity,
  group label, tags, face map.
- Face mapping: per die type, mapping local face normals to semantic values.
  This must be data-driven, not hardcoded only for d6.
- `RollAuthority`: `rng`, `simulation`, and `hybrid`.
- `DiceSimulator`: stepping API, spawn/impulse configuration, settle detection,
  face resolution.
- `DiceRenderer`: package-owned overlay renderer.
- Overlay behavior: transparent or blurred backdrop option, safe-area aware,
  non-fullscreen by default, result handoff to underlying UI.
- Modifier/special-effect mapping: exploding, reroll, discarded, locked, group
  color, crit success/failure, clamps, penetration, and similar flags mapped
  from `RolledDie`.
- Example app validation: realistic consumer integration, overlay above app UI,
  seeded RNG, pre-rolled values, async callback/simulation, groups/tags,
  explosions requiring additional dice, push/reroll, and screenshot or
  rendering checks.

### Proposed Architecture

Core shape:

```dart
enum RollAuthorityMode { rng, simulation, hybrid }

class RollLifecycle {
  Stream<RollLifecycleEvent> start(RollRequest request);
}

class RollRequest {
  final String expression;
  final RollAuthorityMode authority;
  final DiceVisualStyle style;
  final RollOverlayPolicy overlay;
}

abstract class DiceSimulator {
  Future<SimulationOutcome> simulate(DiceWorld world, RollPlan plan);
}

abstract class DiceRenderer {
  Widget buildOverlay(DiceWorld world, RollLifecycleController controller);
}
```

Authority modes:

- `rng`: parser/RNG decides authoritative values; renderer animates dice to
  target faces. This is the first shippable visible-roll path.
- `simulation`: simulator resolves settled dice; resolved values feed the parser
  through the existing async roller path.
- `hybrid`: RNG selects authoritative values, and physics-like motion is
  constrained or corrected to land on those faces. This is likely the best first
  production mode for fairness, replayability, and visual credibility.

### Technology Read

Initial read:

- **Flame**: useful for game loop, components, input, effects, and overlay
  orchestration. Not enough by itself for 3D dice.
- **flame_3d**: relevant but experimental. Promising for a spike, risky as an
  architectural commitment until platform and API stability are proven.
- **Flutter Scene / `flutter_scene`**: conceptually strong fit for a
  Flutter-native 3D scene graph. Needs current stability and Flutter channel
  verification before adoption.
- **Flutter GPU**: likely the right long-term low-level substrate for a custom
  renderer, but early/unstable enough that the first experiment should prove
  real viability before depending on it.
- **Fragment shaders / `flutter_shaders`**: useful for polish such as glow,
  trails, highlights, blur, and impact effects. Not enough for actual 3D dice
  geometry or physics.
- **`flutter_gpu_shaders`**: useful shader build/tooling support, not a dice
  renderer.
- **Impeller**: strategically important rendering base because Flutter GPU and
  shader behavior lean on it.
- **WebView/model-viewer packages**: acceptable contrast for static model
  viewing, wrong as the shared roll lifecycle core.
- **Physics**: Rapier is the strongest reference model for serious rigid-body
  semantics. Dart-native physics packages need a spike before trust.

### Concrete Next Plan

1. Add `doc/3d-dice-architecture.md`.
   Replace the stale package/client boundary with package-owned
   `RollLifecycle`, `DiceWorld`, `DiceBody`, `DiceSimulator`, `DiceRenderer`,
   and `RollAuthority`.

2. Add model-only core types first under `lib/src/visual/` or
   `lib/src/lifecycle/`.
   Keep pure Dart core free of Flutter dependencies.

3. Add a Flutter example package/app.
   The current repo is Dart-only; a real overlay renderer needs a Flutter
   surface.

4. Implement RNG-authoritative overlay first.
   Use existing `DiceExpression` plus `CallbackDiceRoller`; animate target
   faces and emit the same `RollSummary`.

5. Spike Flutter Scene and Flutter GPU separately.
   Build one d6 with face mapping, lighting, camera, transparent overlay, and
   screenshot validation. Decide after evidence.

6. Add simulator contract and one basic simulator spike.
   Start with simple rigid-body settle semantics and face-normal mapping. Treat
   Rapier as the reference model; test whether Dart physics packages are good
   enough before adopting them.

7. Expand tests.
   Keep current VM parser tests. Add Flutter integration tests for overlay
   lifecycle, explosion follow-up rolls, push/reroll, groups/tags, seeded
   replay, and visual nonblank overlay rendering.
