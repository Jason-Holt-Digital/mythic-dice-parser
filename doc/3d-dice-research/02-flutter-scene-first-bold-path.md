# Flutter Scene-First Path

Status: chosen first renderer experiment.

**Mythic Dice Parser should first prove a real Flutter Scene 3D overlay roll, not a 2D facsimile.**

Keep the root Dart package pure, but create an intentionally experimental Flutter Scene app under `example/` that runs on Flutter master and answers whether real 3D scene graph dice can carry the Mythic Dice Parser roll lifecycle.

This path is truth-first: master-channel and preview-package risk are accepted constraints because the spike is meant to reveal whether Flutter Scene is good enough to become the future renderer spine.

---

## Recommendation

Build:

```text
example/dice_scene_experiment/
```

This should be a **Flutter Scene experiment app**, not a general Flutter example. Its purpose is to prove that Mythic Dice Parser can own a real 3D **overlay roll** using Flutter Scene while still producing authoritative `RollSummary` outcomes through `DiceExpression.roll()`.

Flutter Scene is now worth exploring first because it directly targets the product goal: real 3D rendering in Flutter, glTF / `.glb` asset import, PBR materials, environment lighting, and animation. Those are not “polish” for this project; they are the visual foundation for a shared **dice roller**. The current package still warns that it is early preview, depends on Flutter GPU, needs Impeller on native platforms, uses experimental Native Assets / DataAssets, and requires a recent Flutter master build, so this must be isolated from the root package. But it is the right bold spike if the goal is to find out whether Mythic Dice Parser can own beautiful real 3D overlay dice. ([Dart packages][1])

The important distinction: this is **not** “let’s maybe swap in Flutter Scene later.” This is:

> **Flutter Scene is the first renderer under test. The experiment either proves it can carry the roll lifecycle, or it tells us exactly where it breaks.**

---

## What changes from the previous plan

The previous stable plan used a projected Flutter facsimile as the first renderer. This revised plan uses **Flutter Scene first**.

Keep these parts:

* `DiceExpression.create(..., roller: overlayRoller)`
* async `await dice.roll()`
* direct `DiceRoller` integration, with `CallbackDiceRoller` only as a smoke-test adapter if needed
* authoritative `RollSummary`
* `RollLifecycle`
* `DiceWorld`
* `DiceBody`
* `RollAuthority`
* RNG / hybrid / simulation modes
* overlay behavior

Change these parts:

* Replace `CustomPainter` dice with a `SceneView`.
* Replace projected cube math with `Node`, `Mesh`, and `CuboidGeometry` smoke tests, then prove a real d6 scene object: preferably a `.glb`, or a programmatic six-face scene mesh with material/texture mapped faces.
* Replace fake material effects with Flutter Scene PBR / `.fmat` / shader material hooks.
* Make `flutter_scene` and Flutter master setup part of the experiment contract.
* Add a phase for Flutter Scene’s physics contract / Rapier exploration, but only after RNG-authoritative scene dice are working.

Flutter Scene currently supports iOS, Android, and Web, with macOS, Windows, and Linux marked preview; on native platforms it runs where Impeller runs, while Web uses a built-in WebGL2 backend instead of Flutter GPU. ([Dart packages][1]) That is enough to justify a cross-platform renderer spike, but not enough to merge Flutter Scene into the root package yet.

---

## Experiment target

The first pass should prove this flow:

1. User taps **Roll 2d6**.

2. Flutter app calls:

   ```dart
   final dice = DiceExpression.create(
     '2d6 @type=fire @source=spell',
     roller: sceneOverlayRoller,
   );

   final summary = await dice.roll();
   ```

3. The custom roller resolves authoritative values.

4. A transparent Flutter `OverlayEntry` appears above the existing app UI.

5. A Flutter Scene `SceneView` renders one or more real 3D dice.

6. Dice tumble, collide visually or kinematically, and settle.

7. Final visible face matches the authoritative result.

8. Only after visual resolution, the roller yields values back into Mythic Dice Parser.

9. The app displays the resulting `RollSummary`.

Flutter’s `Overlay` model is appropriate for the visual layer because Flutter overlays are a stack of independently managed entries that can float visual elements above other widgets. ([Flutter API Docs][2])

---

## Hard rule for this spike

A spinning cube is not enough.

The acceptance target should be:

> **A real d6 scene object, rendered through Flutter Scene, visually settles on a face that matches the value emitted into Mythic Dice Parser.**

A `CuboidGeometry` cube is acceptable for the first smoke render because Flutter Scene’s own examples use `Scene`, `Mesh`, `CuboidGeometry`, `Node`, `SceneView`, and `PerspectiveCamera` in that shape. ([GitHub][3]) But the spike should not be considered successful until it renders a real d6 scene object:

* preferred: a `.glb` d6 asset with UV/textured numbered faces;
* acceptable control: a programmatic six-face scene mesh with per-face material / texture mapping.

Flutter Scene explicitly supports glTF / `.glb` import, PBR materials, environment maps / image-based lighting, and blended animation, so the d6 `.glb` route is the more product-realistic proof. ([Dart packages][1])

---

# Revised repo shape

Use:

```text
example/
  dice_scene_experiment/
    README.md
    pubspec.yaml
    analysis_options.yaml
    lib/
      main.dart
      scene_roll_demo_app.dart

      lifecycle/
        roll_lifecycle.dart
        roll_authority.dart
        scene_overlay_dice_roller.dart

      overlay/
        scene_dice_overlay_controller.dart
        scene_dice_overlay.dart

      scene/
        scene_dice_world.dart
        scene_dice_body.dart
        scene_dice_renderer.dart
        scene_d6_geometry.dart
        scene_d6_asset_loader.dart
        scene_camera_rig.dart
        scene_lighting.dart

      simulation/
        scene_kinematic_dice_simulator.dart
        scene_physics_dice_simulator.dart

      mapping/
        d6_face_mapping.dart
        roll_visual_mapping.dart

    assets_src/
      dice/
        d6_authority.glb
      environments/
        studio_placeholder.hdr

    hook/
      build.dart

    test/
      d6_face_mapping_test.dart
      scene_roll_authority_test.dart
```

Keep `flutter_scene` out of the root `pubspec.yaml`.

This preserves the root package as pure Dart while letting the example app be aggressive.

---

# Toolchain setup

The experiment should document that it requires Flutter master.

Flutter Scene is currently published as `0.18.1`; its `0.18.0` README requirement still applies: use a Flutter master build from **2026-06-09 or later** because of Flutter GPU render-to-mip-level support. The package says the pubspec lower bound is looser than the real requirement so pub.dev can resolve and score it. ([Dart packages][1])

Use:

```bash
flutter channel master
flutter upgrade

flutter config --enable-native-assets
flutter config --enable-dart-data-assets
```

Then from repo root:

```bash
mkdir -p example/dice_scene_experiment
cd example/dice_scene_experiment

flutter create --platforms=android,ios,macos,windows,linux,web .
```

Run native desktop with:

```bash
flutter run -d macos --enable-flutter-gpu --enable-impeller
```

Run web with:

```bash
flutter run -d chrome
```

Flutter Scene’s own README uses the same setup pattern: enable Native Assets, enable Dart DataAssets, create platform stubs, then run native with `--enable-flutter-gpu --enable-impeller`, while web runs without those native flags. ([Dart packages][1])

---

# `pubspec.yaml`

Use current Flutter Scene versions:

```yaml
name: mythic_dice_scene_experiment
description: Flutter Scene 3D overlay dice experiment for Mythic Dice Parser.
publish_to: none

environment:
  sdk: ^3.10.0

dependencies:
  flutter:
    sdk: flutter

  mythic_dice_parser:
    path: ../..

  flutter_scene: ^0.18.1
  flutter_gpu_shaders: ^0.5.1
  hooks: ^2.0.0
  vector_math: ^2.1.4

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0

flutter:
  uses-material-design: true
```

The Flutter Scene example app tracks the current Flutter Scene package; use `flutter_scene: ^0.18.1` for this spike. The example also uses `flutter_gpu_shaders`, `hooks`, and `vector_math`, and its build hook shows imported scenes registered as DataAssets via `buildScenes`. ([GitHub][4])

---

# Build hook

Create:

```text
example/dice_scene_experiment/hook/build.dart
```

Start with:

```dart
import 'package:hooks/hooks.dart';
import 'package:flutter_scene/build_hooks.dart';

void main(List<String> args) {
  build(args, (config, output) async {
    buildScenes(
      buildInput: config,
      buildOutput: output,
      inputFilePaths: const [
        'assets_src/dice/d6_authority.glb',
      ],
      assetMode: SceneAssetMode.dataAssetsRequired,
      compressTextures: false,
    );
  });
}
```

Flutter Scene’s build hook helpers are intended for app `hook/build.dart` files; `buildScenes` converts glTF `.glb` assets into Flutter Scene’s `.fsceneb` scene format, and in DataAssets mode the outputs can be loaded by source path through `loadScene`. ([GitHub][5])

Do **not** start with custom `.fmat` materials unless the GLB path works. Flutter Scene’s `.fmat` material flow is powerful and avoids manual std140 packing, but it adds another experimental surface. The material path should be Phase 2 visual polish, not Phase 1 viability. ([GitHub][6])

---

# Architecture for the Flutter Scene-first spike

## `RollLifecycle`

The lifecycle stays parser-first and renderer-aware:

```dart
enum RollLifecyclePhase {
  idle,
  parsing,
  requestingAuthority,
  buildingSceneWorld,
  animatingOverlay,
  emittingRollValues,
  resolvingSummary,
  completed,
  failed,
}
```

The key rule:

> Mythic Dice Parser owns the roll lifecycle. Flutter Scene owns scene presentation. The authoritative result is still emitted through the `DiceRoller` contract.

---

## `RollAuthority`

Keep the authority modes:

```dart
enum RollAuthorityMode {
  rng,
  simulation,
  hybrid,
}
```

First implementation: **RNG-authoritative with deterministic kinematic settle**, not physics-authoritative. That is not a retreat. It tests renderer viability, overlay behavior, final face control, and `RollSummary` integration before debugging physics. The next step is hybrid scene dice: physical-looking motion or physics state constrained/corrected to the authoritative value.

---

## `SceneDiceWorld`

This is the scene-backed equivalent of `DiceWorld`:

```dart
class SceneDiceWorld {
  SceneDiceWorld({
    required this.scene,
    required this.bodies,
    required this.seed,
  });

  final Scene scene;
  final List<SceneDiceBody> bodies;
  final int seed;
}
```

Each body owns both the Mythic roll identity and the scene node:

```dart
class SceneDiceBody {
  SceneDiceBody({
    required this.id,
    required this.nsides,
    required this.targetValue,
    required this.geometry,
    required this.node,
    this.groupLabel,
    this.tags = const {},
  });

  final String id;
  final int nsides;
  final int targetValue;
  final D6FaceMapping geometry;
  final Node node;

  final String? groupLabel;
  final Map<String, String> tags;

  DiceBodyState state = DiceBodyState.spawning;
}
```

The scene `Node` is not a visual afterthought. It is the presentation object for a roll body.

---

## D6 face mapping

The face mapping must be explicit and testable:

```dart
class D6FaceMapping {
  static final Map<int, vm.Vector3> localFaceNormals = {
    1: vm.Vector3(0, 1, 0),
    6: vm.Vector3(0, -1, 0),
    2: vm.Vector3(1, 0, 0),
    5: vm.Vector3(-1, 0, 0),
    3: vm.Vector3(0, 0, 1),
    4: vm.Vector3(0, 0, -1),
  };

  vm.Quaternion orientationForTopFace(int value) {
    final localNormal = localFaceNormals[value]!;
    final worldUp = vm.Vector3(0, 1, 0);

    return quaternionFromUnitVectors(localNormal.normalized(), worldUp);
  }

  int topFaceForOrientation(vm.Quaternion rotation) {
    final worldUp = vm.Vector3(0, 1, 0);
    var bestValue = 1;
    var bestDot = -double.infinity;

    for (final entry in localFaceNormals.entries) {
      final transformed = rotation.rotated(entry.value);
      final dot = transformed.dot(worldUp);
      if (dot > bestDot) {
        bestDot = dot;
        bestValue = entry.key;
      }
    }

    return bestValue;
  }
}
```

Test invariant:

```dart
for (final value in [1, 2, 3, 4, 5, 6]) {
  final q = mapping.orientationForTopFace(value);
  expect(mapping.topFaceForOrientation(q), value);
}
```

This exact mapping becomes the bridge to later **physics roll** support: when a simulated rigid body settles, the authoritative value can be derived by taking the face normal most aligned with world up.

---

## `SceneKinematicDiceSimulator`

The first simulator should animate scene nodes directly:

```dart
class SceneKinematicDiceSimulator {
  Future<void> run({
    required SceneDiceWorld world,
    required Duration duration,
    required void Function() onFrame,
  }) async {
    // Driven by SceneView.onTick or an AnimationController.
    // For each body:
    // - translate through an arc
    // - rotate chaotically
    // - in final 30%, slerp to target orientation
    // - snap final transform exactly
  }
}
```

The final frame must do this:

```dart
final targetRotation = body.geometry.orientationForTopFace(body.targetValue);

body.node.localTransform = vm.Matrix4.compose(
  finalPosition,
  targetRotation,
  vm.Vector3.all(1),
);

body.node.markBoundsDirty();

assert(
  body.geometry.topFaceForOrientation(targetRotation) == body.targetValue,
);
```

Flutter Scene examples mutate `Node.localTransform` per frame inside `SceneView.onTick`, which is exactly the pattern needed for this kinematic dice roll. ([GitHub][7])

---

## `SceneDiceOverlay`

The overlay widget should host `SceneView` in a full-screen `OverlayEntry` and explicitly verify transparent composition over the underlying app on each target.

Conceptually:

```dart
class SceneDiceOverlay extends StatefulWidget {
  const SceneDiceOverlay({
    super.key,
    required this.world,
    required this.onCompleted,
  });

  final SceneDiceWorld world;
  final VoidCallback onCompleted;

  @override
  State<SceneDiceOverlay> createState() => _SceneDiceOverlayState();
}

class _SceneDiceOverlayState extends State<SceneDiceOverlay> {
  Duration _elapsed = Duration.zero;
  bool _completed = false;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: false,
      child: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.10),
              ),
              child: SceneView(
                widget.world.scene,
                camera: PerspectiveCamera(
                  position: vm.Vector3(0, 4, -8),
                  target: vm.Vector3(0, 0.8, 0),
                ),
                onTick: (elapsed, deltaSeconds) {
                  _elapsed = elapsed;

                  _simulator.tick(
                    world: widget.world,
                    elapsed: elapsed,
                    deltaSeconds: deltaSeconds,
                  );

                  if (!_completed && _simulator.isResolved(widget.world)) {
                    _completed = true;
                    widget.onCompleted();
                  }
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

This is starter code, not final API. The exact construction should follow the current Flutter Scene example patterns: create a `Scene`, add `Node`s, render through `SceneView`, and provide a `PerspectiveCamera`. ([GitHub][3])

---

# Roll integration

The Flutter Scene-backed roller should still implement the current `DiceRoller` contract.

```dart
class SceneOverlayDiceRoller implements DiceRoller {
  SceneOverlayDiceRoller({
    required this.authority,
    required this.overlayController,
  });

  final RollAuthority authority;
  final SceneDiceOverlayController overlayController;

  @override
  Stream<int> roll({
    required int ndice,
    required int nsides,
    int min = 1,
    DieType dieType = DieType.polyhedral,
  }) async* {
    final values = await authority.resolveInts(
      ndice: ndice,
      nsides: nsides,
      min: min,
      dieType: dieType,
    );

    final world = await SceneDiceWorldFactory.createD6World(
      values: values,
      dieType: dieType,
    );

    await overlayController.show(world);

    for (final value in values) {
      yield value;
    }
  }

  @override
  Stream<T> rollVals<T>(
    int ndice,
    List<T> vals, {
    DieType dieType = DieType.polyhedral,
  }) async* {
    final indexes = await authority.resolveInts(
      ndice: ndice,
      nsides: vals.length,
      min: 0,
      dieType: dieType,
    );

    final visualValues = indexes.map((i) => i + 1).toList();

    final world = await SceneDiceWorldFactory.createD6World(
      values: visualValues,
      dieType: dieType,
    );

    await overlayController.show(world);

    for (final index in indexes) {
      yield vals[index];
    }
  }
}
```

Important: for `rollVals<T>`, the visual d6 value and the semantic value may diverge for custom dice. That is acceptable in the first d6-only spike, but the README must call it out. Later, named die types need proper geometry/value labels rather than pretending every named die is a d6.

---

# Scene startup

Because Flutter Scene `0.18.0` changed resource loading so static scene resources must be initialized asynchronously before constructing geometry/materials, initialize scene resources before rendering dice. ([Dart packages][8])

Use:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Scene.initializeStaticResources();

  runApp(const SceneRollDemoApp());
}
```

The Flutter Scene example app gates example construction on `Scene.initializeStaticResources()` for the same reason. ([GitHub][9])

---

# Asset strategy

## Day-one smoke: generated cube

Start with:

```dart
final mesh = Mesh(
  CuboidGeometry(vm.Vector3(1, 1, 1), debugColors: true),
  UnlitMaterial(),
);

final node = Node(mesh: mesh);
scene.add(node);
```

This proves:

* Flutter Scene boots;
* `SceneView` renders;
* node transforms update;
* overlay layering works;
* dice-like bodies can animate.

But this is only a smoke test.

## Real target: `d6_authority.glb`

Add:

```text
assets_src/dice/d6_authority.glb
```

Asset requirements:

* one cube mesh with bevels;
* visible pips or numbers;
* local coordinate convention documented;
* face-value mapping documented;
* origin at die center;
* scale normalized to 1 world unit;
* top face convention recorded in `D6FaceMapping`.

Use build hook import:

```dart
buildScenes(
  buildInput: config,
  buildOutput: output,
  inputFilePaths: const ['assets_src/dice/d6_authority.glb'],
      assetMode: SceneAssetMode.dataAssetsRequired,
);
```

Then load:

```dart
final d6Node = await loadScene('assets_src/dice/d6_authority.glb');
```

Flutter Scene’s current hook examples use `buildScenes` for source `.glb` files and load them by source path through `loadScene`. ([GitHub][10])

---

# Visual ambition for the Flutter Scene spike

This should not look like a developer cube demo.

Minimum scene quality:

* PBR die material;
* bevels on dice edges;
* visible pips/numbers;
* studio lighting;
* contact shadows or at least shadow-like grounding;
* shallow camera angle;
* transparent Flutter overlay above real app UI;
* small result chip only after the die settles;
* group/tag accents as scene-space labels or subtle emissive rings.

Flutter Scene has image-based lighting, environment maps, PBR materials, directional lights, shadows, ambient occlusion, bloom, color grading, chromatic aberration, vignette, and film grain in its recent changelog, so this spike should test beauty early instead of waiting for a future visual pass. ([Dart packages][8])

---

# Physics path inside this direction

Do not start with physics-authoritative dice. But do include a **physics runway** inside the same Flutter Scene direction.

Flutter Scene `0.16.0` added an abstract physics contract for rigid bodies, colliders, shapes, joints, physics materials, scene queries, and collision/trigger streams, with a full backend provided by `flutter_scene_rapier`. ([Dart packages][8]) Its example app includes a `RapierWorld`, dynamic bodies, colliders, joints, triggers, and collision streams. ([GitHub][11])

The revised sequence should be:

1. **RNG-authoritative scene dice**

   * real 3D renderer
   * visual face forced to authoritative value
   * real `RollSummary`

2. **Hybrid scene dice**

   * kinematic animation with physical-looking arcs/bounces
   * face still forced to authoritative value
   * scene graph remains compatible with physics body poses

3. **Physics-authority spike**

   * add a single d6 rigid body
   * drop/throw into a tray
   * wait until sleep/settle
   * compute top face from final orientation
   * feed that value into Mythic Dice Parser

This is a bold path because physics is not fake future work; it is deferred only until the renderer/lifecycle bridge works.

---

# Concrete implementation phases

## Phase 1 — Flutter Scene boot

Create the example app and show a single rotating `CuboidGeometry` inside a transparent overlay.

Files:

```text
example/dice_scene_experiment/lib/main.dart
example/dice_scene_experiment/lib/scene_roll_demo_app.dart
example/dice_scene_experiment/lib/overlay/scene_dice_overlay.dart
```

Acceptance:

* app boots on Chrome;
* app boots on one native target with required flags;
* `SceneView` renders nonblank;
* underlying UI is still visible behind the overlay;
* cube rotates.

This tests the toolchain and Flutter Scene viability before any Mythic Dice Parser integration.

---

## Phase 2 — Mythic Dice Parser integration

Create:

```text
lib/lifecycle/roll_authority.dart
lib/lifecycle/scene_overlay_dice_roller.dart
lib/overlay/scene_dice_overlay_controller.dart
```

Acceptance:

```dart
final dice = DiceExpression.create('1d6', roller: sceneOverlayRoller);
final summary = await dice.roll();
```

The overlay must appear before values are yielded and disappear before the UI displays the summary.

---

## Phase 3 — deterministic d6 face mapping

Create:

```text
lib/mapping/d6_face_mapping.dart
test/d6_face_mapping_test.dart
```

Acceptance:

* every value 1–6 maps to a deterministic orientation;
* every deterministic orientation maps back to the same top face;
* final scene node transform uses this orientation.

This is the most important correctness test in the whole experiment.

---

## Phase 4 — real d6 asset

Add:

```text
assets_src/dice/d6_authority.glb
hook/build.dart
```

Acceptance:

* `loadScene('assets_src/dice/d6_authority.glb')` works;
* a visible d6 appears;
* final face matches authoritative value;
* d6 can be duplicated for `2d6`.

This is the point where the spike starts answering the actual product question.

---

## Phase 5 — overlay roll lifecycle

Implement:

```text
lib/scene/scene_dice_world.dart
lib/scene/scene_dice_body.dart
lib/simulation/scene_kinematic_dice_simulator.dart
```

Acceptance:

* `1d6` and `2d6` animate;
* dice enter from offscreen or above camera;
* dice tumble independently;
* dice settle on exact target faces;
* overlay completes;
* `RollSummary` emits.

---

## Phase 6 — tags, groups, and special effects hooks

Add visual mapping:

```text
lib/mapping/roll_visual_mapping.dart
```

Initial mapping:

| Roll metadata | Flutter Scene treatment                                                                   |
| ------------- | ----------------------------------------------------------------------------------------- |
| `groupLabel`  | small Flutter overlay label anchored near die screen position, or scene-space label later |
| `@type=fire`  | warm material/emissive accent                                                             |
| `discarded`   | dim die / move aside                                                                      |
| `critSuccess` | flash/bloom burst                                                                         |
| `critFailure` | dark crack / shake                                                                        |
| `exploded`    | spawn follow-up die from original die                                                     |
| `rerolled`    | ghost old die, animate replacement                                                        |
| `locked`      | skip tumble and keep node fixed                                                           |

Do not implement every effect. Prove the mapping pipeline exists.

---

## Phase 7 — physics spike

Create:

```text
lib/simulation/scene_physics_dice_simulator.dart
```

Acceptance:

* one cube body uses a physics world;
* it falls/settles on a tray;
* top face is computed from final orientation;
* physics result can be fed into Mythic Dice Parser.

This phase is allowed to fail. If it fails, the result is still valuable: Flutter Scene may remain the renderer while physics authority comes from a separate engine adapter later.

---

# Validation checklist

## Renderer viability

* [ ] Flutter Scene example app builds.
* [ ] `Scene.initializeStaticResources()` completes before scene construction.
* [ ] `SceneView` renders nonblank.
* [ ] Scene can be hosted inside `OverlayEntry`.
* [ ] Underlying Flutter UI remains visible.
* [ ] Overlay can be removed cleanly.
* [ ] Repeated rolls do not leak overlay entries or scene nodes.

## Dice visual correctness

* [ ] d6 model appears with readable faces.
* [ ] die tumbles around multiple axes.
* [ ] die settles naturally.
* [ ] final face equals target value.
* [ ] `D6FaceMapping` tests pass for values 1–6.
* [ ] two dice can animate independently.
* [ ] dice do not all overlap at rest.

## Parser correctness

* [ ] `DiceExpression.create('1d6', roller: sceneOverlayRoller)` works.
* [ ] `DiceExpression.create('2d6', roller: sceneOverlayRoller)` works.
* [ ] `await dice.roll()` waits for visual completion.
* [ ] `RollSummary.total` matches visible values.
* [ ] `RollSummary.results` contains the expected `RolledDie` metadata.
* [ ] group/tag expressions still parse and roll.

## Platform checks

* [ ] Chrome.
* [ ] macOS with `--enable-flutter-gpu --enable-impeller`.
* [ ] iOS or Android.
* [ ] At least one desktop preview target if available.
* [ ] Mobile portrait.
* [ ] Mobile landscape.
* [ ] Resizable desktop window.

## Risk checks

* [ ] Document exact Flutter master revision used.
* [ ] Document whether web works acceptably or has rough edges.
* [ ] Document whether native desktop preview is usable.
* [ ] Document whether GLB import works reliably.
* [ ] Document whether shader/material hot reload is needed or avoidable.
* [ ] Document whether physics is viable in this stack.

---

# Main risks

## Flutter master dependency

This is the biggest operational risk. Flutter Scene currently depends on preview Flutter GPU functionality and a recent Flutter master build. ([Dart packages][1])

Mitigation: isolate it in `example/dice_scene_experiment/`, add a README with the exact Flutter revision, and avoid changing the root package SDK constraints unless absolutely necessary.

## API churn

Flutter GPU’s own docs warn that it is early preview and does not guarantee API stability. ([GitHub][12])

Mitigation: keep all Flutter Scene code behind experiment-local classes. Do not export any Flutter Scene type from Mythic Dice Parser’s public API yet.

## Web rough edges

Flutter Scene says web support is new and in preview, using a built-in WebGL2 backend under CanvasKit and Skwasm. ([Dart packages][1])

Mitigation: web is a validation target, but native mobile/desktop should be the primary visual bar.

## Asset pipeline complexity

The GLB/DataAssets/build hook path is more complex than plain Flutter assets.

Mitigation: first render `CuboidGeometry`, then add `d6_authority.glb`. Do not block Mythic Dice Parser integration on the asset pipeline until the scene smoke test passes.

## Physics uncertainty

Flutter Scene has a physics contract and Rapier backend path, but a correct dice physics roll has stricter requirements than a general character demo: stable sleeping, face detection, tray collision, fair distribution, deterministic test mode, and cross-platform behavior.

Mitigation: first make the renderer lifecycle work with RNG/hybrid authority, then run physics as a separate authority mode.

---

# Decisions to make now

Make these decisions immediately:

1. **Flutter Scene is the first renderer spike.**
2. **The spike lives under `example/dice_scene_experiment/`.**
3. **The root package remains pure Dart.**
4. **The first roll mode is RNG-authoritative kinematic settle, with a hybrid-ready body/face mapping model.**
5. **The visual acceptance gate is a real d6 scene object: `.glb` preferred, programmatic six-face mesh acceptable, `CuboidGeometry` smoke-only.**
6. **Physics is part of the same direction, but not Phase 1.**

Do **not** decide yet:

* final public renderer API;
* final asset format for all dice;
* whether production uses Flutter Scene forever;
* whether physics authority uses Flutter Scene Rapier, native Rapier, Bullet, or another engine;
* whether 3D renderer code belongs in this package or a sibling package.

---

# Revised bottom line

The bold Flutter Scene-first experiment should be:

> **A master-channel Flutter example app where Mythic Dice Parser triggers a real Flutter Scene 3D overlay roll, animates one or more real d6 scene nodes, lands them on authoritative values, then returns a real `RollSummary` through `DiceExpression.roll()`.**

This is no longer a safe facsimile probe. It is a real renderer bet, safely contained. If it works, Mythic Dice Parser gets a credible path toward beautiful cross-platform 3D overlay rolls. If it breaks, the failure will be specific: toolchain, asset pipeline, web backend, overlay compositing, face mapping, or physics readiness.

[1]: https://pub.dev/packages/flutter_scene "flutter_scene | Flutter package"
[2]: https://api.flutter.dev/flutter/widgets/Overlay-class.html "Overlay class - widgets library - Dart API"
[3]: https://raw.githubusercontent.com/bdero/flutter_scene/master/examples/flutter_app/lib/example_cuboid.dart "raw.githubusercontent.com"
[4]: https://raw.githubusercontent.com/bdero/flutter_scene/master/examples/flutter_app/pubspec.yaml "raw.githubusercontent.com"
[5]: https://raw.githubusercontent.com/bdero/flutter_scene/master/packages/flutter_scene/lib/build_hooks.dart "raw.githubusercontent.com"
[6]: https://raw.githubusercontent.com/bdero/flutter_scene/master/MATERIALS.md "raw.githubusercontent.com"
[7]: https://raw.githubusercontent.com/bdero/flutter_scene/master/examples/flutter_app/lib/example_toon.dart "raw.githubusercontent.com"
[8]: https://pub.dev/packages/flutter_scene/changelog "flutter_scene changelog | Flutter package"
[9]: https://raw.githubusercontent.com/bdero/flutter_scene/master/examples/flutter_app/lib/main.dart "raw.githubusercontent.com"
[10]: https://raw.githubusercontent.com/bdero/flutter_scene/master/examples/flutter_app/hook/build.dart "raw.githubusercontent.com"
[11]: https://raw.githubusercontent.com/bdero/flutter_scene/master/examples/flutter_app/lib/example_physics.dart "raw.githubusercontent.com"
[12]: https://github.com/flutter/engine/blob/main/docs/impeller/Flutter-GPU.md "engine/docs/impeller/Flutter-GPU.md at main · flutter-team-archive/engine · GitHub"
