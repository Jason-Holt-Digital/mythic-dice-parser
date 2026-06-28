# Stable Facsimile Fallback/Control Path

Status: fallback/control path. This document preserves the stable-first proposal as research progression, but the current chosen first experiment is Flutter Scene-first under `example/dice_scene_experiment/`.

If the Flutter Scene spike fails a documented gate or a control renderer is explicitly needed, build the fallback/control experiment as a **stable Flutter, RNG-authoritative facsimile overlay roll** in `example/dice_3d_experiment/`.

That means Mythic Dice Parser still owns the **roll lifecycle**: the parser requests values through an async dice roller, the Flutter overlay visibly tumbles dice, the dice settle on the authoritative faces, and only then the values are yielded back so `await dice.roll()` produces a real `RollSummary`.

This fallback/control path proves the lifecycle claim without the Flutter Scene stack: **Mythic Dice Parser can own visible 3D-style facsimile overlay rolls and structured outcomes together**. Flutter’s built-in widget/rendering stack, `CustomPainter`, transforms, `OverlayEntry`, and optional fragment shaders are stable enough for the fallback/control proof. Flutter `Overlay` is explicitly designed to let independent widgets float above other widgets through `OverlayEntry`, which matches the required **overlay roll** behavior. ([Flutter API Docs][1])

Do **not** make `flame_3d` the first core path. It is promising, but the current package describes itself as experimental, depends on Flutter GPU / Impeller, warns that APIs may break, and currently lists Android, iOS, and macOS support while marking Windows, Linux, and Web unsupported. That violates the **cross-platform renderer** requirement if treated as the core experiment. ([Dart packages][2])

Within this fallback/control path, do **not** use `flutter_scene` as the stable fallback renderer. Flutter Scene is already the selected first spike because it supports glTF / `.glb`, PBR materials, environment maps, lighting, and animation. This fallback/control document exists for the separate case where the Flutter Scene spike hits a documented blocker or the team needs a stable comparison renderer. ([Dart packages][3])

The fallback/control prototype **will prove**:

* overlay roll ownership above existing Flutter UI;
* d6 dice visibly move, rotate, and resolve;
* final visual face matches the authoritative result;
* `DiceExpression.create(..., roller: overlayRoller)` and `await dice.roll()` produce a real `RollSummary`;
* multi-die choreography works;
* group labels, tags, discarded dice, explosions, and rerolls have visual hooks;
* seeded deterministic visual tests are possible;
* the architecture is **physics-ready** because `DiceWorld`, `DiceBody`, face normals, final orientations, and authority modes are first-class concepts.

It **will not prove**:

* physically generated randomness;
* rigid-body collision accuracy;
* mesh/PBR rendering quality;
* d20/d10/d12 geometry;
* Rapier / Bullet / Jolt / Oimo integration;
* performance under large dice pools.

That is acceptable. This fallback/control experiment would answer whether the package can own the **roll lifecycle** and overlay contract without the Flutter Scene stack.

---

# 2. Experiment Shape

## Repo location

Create a Flutter example app here:

```text
example/dice_3d_experiment/
```

This keeps the package core pure Dart. Do **not** add Flutter dependencies to the root `lib/` package yet.

Recommended structure:

```text
mythic_dice_parser/
  lib/
    ...existing pure Dart parser package...
  example/
    ...existing CLI examples...
    dice_3d_experiment/
      pubspec.yaml
      README.md
      lib/
        main.dart
        roll_demo_app.dart
        lifecycle/
          roll_lifecycle.dart
          roll_authority.dart
          overlay_dice_roller.dart
        overlay/
          dice_overlay_controller.dart
          dice_overlay.dart
        world/
          dice_world.dart
          dice_body.dart
          die_geometry.dart
          d6_geometry.dart
        sim/
          facsimile_dice_simulator.dart
        render/
          projected_dice_renderer.dart
          d6_face_painter.dart
      test/
        d6_face_mapping_test.dart
        callback_roll_flow_test.dart
```

## App type

Use a **Flutter example app**, not a separate package at the repo root.

Reason: the experiment needs Flutter UI, overlays, animation, and viewport checks, but Mythic Dice Parser itself should remain a portable Dart package. A nested example app can depend on the root package via path dependency:

```yaml
dependencies:
  flutter:
    sdk: flutter
  mythic_dice_parser:
    path: ../..
  vector_math: ^2.4.0
```

`vector_math` is published by `flutter.dev`, supports 2D/3D/4D vectors and matrices, and includes quaternions, which are useful for dice pose and final-orientation math. ([Dart packages][4])

## Minimal screens/widgets

One screen is enough:

```text
RollDemoApp
 ├─ visible underlying app UI
 │   ├─ title
 │   ├─ text field: dice expression
 │   ├─ buttons: Roll 1d6, Roll 2d6, Seeded Roll
 │   └─ last RollSummary panel
 └─ DiceOverlayController inserts OverlayEntry while rolling
     └─ DiceOverlay
         ├─ transparent full-screen CustomPaint renderer
         ├─ optional result chips / group labels
         └─ fade-out completion
```

The underlying screen should deliberately contain visible cards, text, or a grid so the overlay transparency can be validated.

## Minimal roll flow

The first useful flow:

1. User taps **Roll 2d6**.

2. App creates:

   ```dart
   final dice = DiceExpression.create(
     '2d6 @type=fire @source=spell',
     roller: overlayDiceRoller,
   );
   ```

3. `await dice.roll()` calls the custom async roller.

4. The async roller generates or receives authoritative values.

5. `DiceOverlayController` displays an overlay roll.

6. Dice tumble and settle on those exact values.

7. The roller yields the values back into Mythic Dice Parser.

8. Parser returns a real `RollSummary`.

9. UI displays `summary.total`, `summary.results`, `summary.groups`, and `summary.detailedResults`.

## Minimal dependencies

Start with:

```yaml
dependencies:
  flutter:
    sdk: flutter
  mythic_dice_parser:
    path: ../..
  vector_math: ^2.4.0
```

Do **not** add `flame`, `flame_3d`, `flutter_scene`, or a physics engine on day one.

Optional day-two polish:

```yaml
dependencies:
  flutter_shaders: ^0.1.3
```

`flutter_shaders` is a small helper package around Flutter `FragmentProgram`; the package currently lists Android, iOS, Linux, macOS, Web, and Windows support. Flutter’s official shader docs support custom fragment shaders across Skia and Impeller, but they also state that Flutter does not support custom vertex shaders, so shaders should be treated as visual polish rather than geometry. ([Dart packages][5])

---

# 3. Architecture Sketch

## `RollLifecycle`

`RollLifecycle` is the experiment coordinator.

It should not be a final public API yet. Keep it inside the example app until the shape is proven.

```dart
enum RollLifecyclePhase {
  idle,
  parsing,
  awaitingAuthority,
  animating,
  applyingModifiers,
  completed,
  failed,
}

class RollLifecycle {
  RollLifecycle({
    required this.expression,
    required this.authority,
    required this.overlayController,
  });

  final String expression;
  final RollAuthority authority;
  final DiceOverlayController overlayController;

  Future<RollSummary> roll() async {
    final roller = OverlayDiceRoller(
      authority: authority,
      overlayController: overlayController,
    );

    final dice = DiceExpression.create(expression, roller: roller);
    return dice.roll();
  }
}
```

The lifecycle should emit simple events later:

```dart
sealed class RollLifecycleEvent {}

class RollStarted extends RollLifecycleEvent {}
class DiceSpawned extends RollLifecycleEvent {}
class DiceVisuallyResolved extends RollLifecycleEvent {}
class RollSummaryResolved extends RollLifecycleEvent {
  RollSummaryResolved(this.summary);
  final RollSummary summary;
}
class RollCompleted extends RollLifecycleEvent {}
```

This prevents consuming apps from needing to guess whether the overlay, parser, or modifier system is in charge.

## `DiceWorld`

`DiceWorld` is the shared state consumed by both simulator and renderer.

```dart
class DiceWorld {
  DiceWorld({
    required this.seed,
    required this.bodies,
    required this.startedAt,
  });

  final int seed;
  final List<DiceBody> bodies;
  final DateTime startedAt;

  double timeSeconds = 0;
}
```

It should eventually contain:

```dart
class DiceWorld {
  final List<DiceBody> bodies;
  final DiceCamera camera;
  final DiceLighting lighting;
  final DiceTableBounds bounds;
  final Map<String, VisualGroupStyle> groupStyles;
  final Map<String, VisualTagStyle> tagStyles;
}
```

The important design point: the renderer does not receive “draw a number 6.” It receives a world with die bodies, poses, face mapping, group labels, tags, and roll states.

## `DiceBody`

`DiceBody` represents one visible die.

```dart
enum DiceBodyState {
  spawning,
  tumbling,
  settling,
  resolved,
  discarded,
  exploding,
  rerolling,
  locked,
}

class DiceBody {
  DiceBody({
    required this.id,
    required this.nsides,
    required this.dieType,
    required this.targetValue,
    required this.geometry,
    this.groupLabel,
    this.tags = const {},
  });

  final String id;
  final int nsides;
  final DieType dieType;
  final int targetValue;
  final DieGeometry geometry;

  final String? groupLabel;
  final Map<String, String> tags;

  Vector3 position = Vector3.zero();
  Quaternion rotation = Quaternion.identity();

  Vector3 linearVelocity = Vector3.zero();
  Vector3 angularVelocity = Vector3.zero();

  DiceBodyState state = DiceBodyState.spawning;
}
```

Even in the facsimile experiment, keep `position`, `rotation`, `linearVelocity`, and `angularVelocity`. That is what makes the architecture **physics-ready** instead of merely animation-ready.

## Die geometry and face mapping

Start with d6 only.

Define the d6 face mapping explicitly:

```dart
abstract class DieGeometry {
  int get nsides;

  Vector3 faceNormalForValue(int value);

  Quaternion settleOrientationForValue(int value);

  int valueForWorldUpFace(Quaternion rotation);
}
```

For d6:

```dart
class D6Geometry implements DieGeometry {
  @override
  int get nsides => 6;

  static const opposites = {
    1: 6,
    6: 1,
    2: 5,
    5: 2,
    3: 4,
    4: 3,
  };

  @override
  Vector3 faceNormalForValue(int value) {
    return switch (value) {
      1 => Vector3(0, 1, 0),
      6 => Vector3(0, -1, 0),
      2 => Vector3(1, 0, 0),
      5 => Vector3(-1, 0, 0),
      3 => Vector3(0, 0, 1),
      4 => Vector3(0, 0, -1),
      _ => throw ArgumentError.value(value, 'value'),
    };
  }

  @override
  Quaternion settleOrientationForValue(int value) {
    // Return a rotation that places faceNormalForValue(value)
    // toward the camera-facing or top-facing resolved direction.
    // Exact implementation belongs in the prototype and must be unit-tested.
    throw UnimplementedError();
  }

  @override
  int valueForWorldUpFace(Quaternion rotation) {
    // Transform local face normals by rotation and select the face
    // with highest dot(worldUp).
    throw UnimplementedError();
  }
}
```

The exact convention does not matter as long as it is deterministic and tested. The test should assert:

```dart
for (final value in [1, 2, 3, 4, 5, 6]) {
  final q = geometry.settleOrientationForValue(value);
  expect(geometry.valueForWorldUpFace(q), value);
}
```

That same face-normal logic is what a later **physics roll** uses after the rigid body settles.

## `RollAuthority` modes

Define three modes now, even if only one is implemented.

```dart
enum RollAuthorityMode {
  rng,
  simulation,
  hybrid,
}
```

### `rng`

An **RNG roll** determines values first. The overlay animates toward those values.

Use RNG-authoritative kinematic settle for the fallback/control prototype.

### `simulation`

A **physics roll** determines values from the final settled body orientation.

Do not implement this first.

### `hybrid`

A hybrid mode uses RNG-authoritative values but runs a physics-like or constrained simulation that lands on those values. Keep the fallback/control model hybrid-ready, but do not claim physics authority until a simulator actually resolves values from settled body orientation.

```dart
abstract class RollAuthority {
  RollAuthorityMode get mode;

  Future<List<int>> resolveInts({
    required int ndice,
    required int nsides,
    required int min,
    required DieType dieType,
  });
}
```

For the fallback/control prototype:

```dart
class SeededRngRollAuthority implements RollAuthority {
  SeededRngRollAuthority(this.random);

  final Random random;

  @override
  RollAuthorityMode get mode => RollAuthorityMode.rng;

  @override
  Future<List<int>> resolveInts({
    required int ndice,
    required int nsides,
    required int min,
    required DieType dieType,
  }) async {
    return List.generate(ndice, (_) => min + random.nextInt(nsides));
  }
}
```

## `DiceSimulator`

The first simulator should be kinematic, not physics-rigid-body.

```dart
abstract class DiceSimulator {
  Future<void> run({
    required DiceWorld world,
    required Duration duration,
    required void Function() onTick,
  });
}
```

First implementation:

```dart
class FacsimileDiceSimulator implements DiceSimulator {
  FacsimileDiceSimulator({required this.vsync});

  final TickerProvider vsync;

  @override
  Future<void> run({
    required DiceWorld world,
    required Duration duration,
    required void Function() onTick,
  }) async {
    // AnimationController-driven tumble.
    // Update position, rotation, state.
    // Last 25–30% slerps into geometry.settleOrientationForValue(targetValue).
  }
}
```

Rules:

* first 60–70%: fast spin, bounce, drift;
* final 30%: settle and align to target face;
* final frame: snap to exact `settleOrientationForValue(targetValue)`;
* after completion: validate `valueForWorldUpFace(rotation) == targetValue`.

## `DiceRenderer`

First renderer:

```dart
class ProjectedDiceRenderer extends CustomPainter {
  ProjectedDiceRenderer(this.world);

  final DiceWorld world;

  @override
  void paint(Canvas canvas, Size size) {
    for (final body in sortedByDepth(world.bodies)) {
      _paintD6(canvas, size, body);
    }
  }

  @override
  bool shouldRepaint(ProjectedDiceRenderer oldDelegate) => true;
}
```

This can be implemented as:

* projected cube polygons;
* pips painted on visible faces;
* shadow ellipse under each die;
* label chip for `groupLabel`;
* tag-driven accent ring;
* discarded dice fade;
* explosion/reroll spawn marker.

This is not a real mesh renderer. It is a **physics-ready facsimile renderer** because it consumes `DiceBody` pose and `DieGeometry` face mapping rather than ad-hoc animation numbers.

## Overlay behavior

Use `OverlayEntry`.

```dart
class DiceOverlayController {
  DiceOverlayController(this.context);

  final BuildContext context;
  OverlayEntry? _entry;

  Future<void> showRoll(DiceWorld world) async {
    final completer = Completer<void>();

    _entry = OverlayEntry(
      builder: (_) {
        return Positioned.fill(
          child: AbsorbPointer(
            absorbing: true,
            child: DiceOverlay(
              world: world,
              onCompleted: completer.complete,
            ),
          ),
        );
      },
    );

    Overlay.of(context).insert(_entry!);

    await completer.future;
    _entry?.remove();
    _entry = null;
  }
}
```

Use `AbsorbPointer` by default so rolling blocks duplicate taps. Test `IgnorePointer(ignoring: true)` only as an alternate pass-through mode.

## Modifier and special-effect mapping

The **underlying roll model** remains authoritative. Visuals are projections of resolved roll metadata, not a second rule engine.

Initial visual mapping:

| Roll metadata                 | First visual treatment                        |
| ----------------------------- | --------------------------------------------- |
| `groupLabel`                  | small label above die or color/accent ring    |
| tags like `@type=fire`        | shaderless glow/accent, later fragment shader |
| `discarded`                   | fade die, lower opacity, strike mark          |
| `success` / `failure`         | small badge or burst                          |
| `critSuccess` / `critFailure` | stronger burst / crack effect                 |
| `exploded` / `explosion`      | spawn follow-up die from original die         |
| `reroll` / `rerolled`         | ghost old value, animate replacement          |
| `locked`                      | lock icon / reduced motion                    |

Only implement `groupLabel`, tags, and basic explosion/reroll hooks in the fallback/control first pass. The goal is to prove that visual state can be driven from `RolledDie` metadata once the `RollSummary` exists.

## Integration with `DiceExpression` and `CallbackDiceRoller`

Because the current `DiceRoller` returns streams, the overlay-backed roller can wait for animation before yielding values.

Experiment-local implementation:

```dart
class OverlayDiceRoller implements DiceRoller {
  OverlayDiceRoller({
    required this.authority,
    required this.overlayController,
  });

  final RollAuthority authority;
  final DiceOverlayController overlayController;

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

    final world = DiceWorldFactory.fromResolvedInts(
      values: values,
      nsides: nsides,
      min: min,
      dieType: dieType,
    );

    await overlayController.showRoll(world);

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

    final world = DiceWorldFactory.fromResolvedIndexes(
      indexes: indexes,
      valueCount: vals.length,
      dieType: dieType,
    );

    await overlayController.showRoll(world);

    for (final index in indexes) {
      yield vals[index];
    }
  }
}
```

If the existing `CallbackDiceRoller` constructor already wraps async callbacks, use it instead of this class. If not, keep this class inside the example app and treat it as the reference adapter for the eventual integration contract.

---

# 4. Technology Comparison

| Technology                                                           |                                                      Stable Flutter today? | Platforms                                                                          |                                Real 3D geometry? |                                     Dice face mapping? |                                              Physics? |                                  Transparent overlay above Flutter UI? |     Fit for authoritative `RollSummary` | Current risks                                                                                              | One-day prototype                                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------: | ---------------------------------------------------------------------------------- | -----------------------------------------------: | -----------------------------------------------------: | ----------------------------------------------------: | ---------------------------------------------------------------------: | --------------------------------------: | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Flutter `CustomPainter`, `Matrix4`, `Transform`, `InteractiveViewer` |                                                                        Yes | Flutter-supported mobile, desktop, web                                             |                           Facsimile, not mesh 3D |                Excellent for d6; deterministic mapping |                                 No rigid-body physics |                                       Yes via `OverlayEntry` / `Stack` | Excellent; async roller controls values | Visual quality ceiling; d6 first; math must be tested                                                      | Projected d6 cube tumbles, settles on target face, emits `RollSummary`                                      |
| Fragment shaders / `flutter_shaders`                                 |                                                   Yes for fragment shaders | `flutter_shaders` lists Android, iOS, Linux, macOS, Web, Windows                   |                                      No geometry |                   Useful for glow/shadow/material feel |                                                    No |                                                                    Yes |                 Good as renderer polish | Flutter supports fragment shaders but not custom vertex shaders; shader limits matter                      | Add glow, shadow, distortion, elemental tag effects ([Flutter Docs][6])                                     |
| Flutter Flame                                                        |                                                                        Yes | Flame package lists Android, iOS, Linux, macOS, Web, Windows                       |                                 Flame core is 2D |                           Possible as sprite/facsimile | 2D collision / Forge2D ecosystem, not 3D dice physics | Yes; `GameWidget` can live in Flutter tree and Flame supports overlays |       Good if using game-loop structure | Adds game-engine dependency before needed; still not real 3D                                               | Use `GameWidget` for dice animation loop, but no real benefit over `CustomPainter` yet ([Dart packages][7]) |
| `flame_3d`                                                           |                                                      Not production-stable | Current package lists Android, iOS, macOS; Windows/Linux/Web unsupported           |                                              Yes |                                               Possible |            Rendering only; no full dice physics story |                                           Likely via Flame widget tree |  Values can be fed through async roller | Experimental; Flutter GPU dependency; platform gap; docs/tests limited                                     | Rotating cube/d6 on macOS/iOS/Android only ([Dart packages][2])                                             |
| `flutter_scene`                                                      |                 No for stable-first path; currently master-channel preview | iOS, Android, Web supported; desktop preview with Impeller flags                   |       Yes: glTF / `.glb`, PBR, lights, animation | Strong if dice meshes/materials are authored correctly |                                        Rendering only |                                     Yes as Flutter widget/render layer |                  Good with async roller | Requires Flutter master, Flutter GPU, Native Assets/DataAssets, Impeller; preview web rough edges          | On Flutter master: render animated `.glb` d6 and orient to target face ([Dart packages][3])                 |
| Flutter GPU                                                          |                                              No; preview / master-oriented | Native where Impeller works; web story depends on higher-level stack               |                        Yes if you build renderer |                             Possible but too low-level |                                                    No |                                                               Possible |                                Possible | Low-level API, no API stability, steep learning curve; docs recommend higher-level packages for most users | Too much for first day unless validating engine internals ([GitHub][8])                                     |
| `flutter_gpu_shaders`                                                |                                                   No for stable-first path | Package currently lists Android, iOS, Linux, macOS, Windows; not Web               |              Shader bundle support, not renderer |                                               Indirect |                                                    No |                                                               Possible |                                Indirect | Native Assets / Flutter GPU path; no Web listing                                                           | Only relevant with Flutter GPU / Scene spike ([Dart packages][9])                                           |
| Impeller                                                             | Yes as renderer backend on current Flutter mobile; not an app-level 3D API | iOS default; Android API 29+ default; desktop flags / preview areas                |                       No direct app geometry API |                                               Indirect |                                                    No |                                                                    N/A |                                Indirect | Backend behavior differs by platform; Web currently uses Skia renderers                                    | Treat as rendering backend, not dice architecture ([Flutter Docs][10])                                      |
| Oimo Dart package                                                    |                                                             Package exists | Package metadata lists all Flutter platforms                                       |                                     No rendering |                   Possible from rigid-body orientation |                                      Basic 3D physics |                                                      Renderer separate |             Possible after adapter work | Low adoption, unverified uploader, basic engine; no rendering                                              | Console / debug physics d6 settle test, not visual core ([Dart packages][11])                               |
| Cannon Dart package                                                  |                                                             Package exists | Package metadata lists all Flutter platforms                                       |                                     No rendering |                   Possible from rigid-body orientation |                              Basic rigid-body physics |                                                      Renderer separate |             Possible after adapter work | Low adoption, unverified uploader, old JS-engine port; no rendering                                        | Physics-only d6 settle test ([Dart packages][12])                                                           |
| Rapier                                                               |                           Credible engine, but not directly Flutter-native | Rust, JS/WASM official packages                                                    |                                     No rendering |                                   Strong if integrated |                                  Strong 2D/3D physics |                                                      Renderer separate |      Strong future simulation authority | Needs FFI/WASM/native binding strategy; JS package is not a Flutter renderer                               | Later physics spike, not first overlay experiment ([Rapier][13])                                            |
| Bullet                                                               |                                                Credible C++ physics engine | C++ engine tested across desktop/mobile OSes                                       |                                     No rendering |                                   Strong if integrated |                                                Strong |                                                      Renderer separate |      Strong future simulation authority | Requires FFI/native build package; heavy integration                                                       | Later native physics package spike ([GitHub][14])                                                           |
| Jolt Dart bindings                                                   |                                                                  Too early | Package metadata lists platforms, but package is dev and README says “Coming Soon” |                                     No rendering |                                    Eventually possible |                                    Potentially strong |                                                      Renderer separate |                                   Later | Not usable enough yet                                                                                      | Watch, do not build the fallback/control path on it ([Dart packages][15])                                  |
| WebView / `model_viewer_plus`                                        |                                                   Usable for model display | Android, iOS, Web                                                                  | Displays glTF/GLB through WebView / model-viewer |                                Weak for roll lifecycle |                             No dice physics ownership |                          Technically overlayable, but WebView boundary |                           Poor core fit | WebView boundary, limited platform set, model display not lifecycle/simulation                             | Contrast only; do not use as core ([Dart packages][16])                                                     |

Conclusion from the fallback/control comparison: stable Flutter facsimile rendering is the control path if the Flutter Scene-first spike fails a documented gate or if a comparison renderer is explicitly needed.

---

# 5. Proposed First Prototype

## Dependencies

`example/dice_3d_experiment/pubspec.yaml`:

```yaml
name: mythic_dice_3d_experiment
description: Flutter overlay dice roll experiment for Mythic Dice Parser.
publish_to: none

environment:
  sdk: ^3.10.0

dependencies:
  flutter:
    sdk: flutter
  mythic_dice_parser:
    path: ../..
  vector_math: ^2.4.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  lints: ^6.0.0

flutter:
  uses-material-design: true
```

Use whatever SDK lower bound matches the repo after checking the root `pubspec.yaml`. `vector_math` 2.4.0 currently requires Dart 3.10 according to its changelog, so pin lower if the repo still supports older Dart versions. ([Dart packages][17])

## Create and run commands

From repo root:

```bash
mkdir -p example/dice_3d_experiment
cd example/dice_3d_experiment

flutter create --platforms=android,ios,macos,windows,linux,web .

# Edit pubspec.yaml to add:
# mythic_dice_parser:
#   path: ../..
# vector_math: ^2.4.0

flutter pub get
flutter run -d chrome
flutter run -d macos
```

Also run at least one mobile target:

```bash
flutter run -d ios
# or
flutter run -d android
```

## File structure

```text
lib/
  main.dart
  roll_demo_app.dart

  lifecycle/
    roll_lifecycle.dart
    roll_authority.dart
    overlay_dice_roller.dart

  overlay/
    dice_overlay_controller.dart
    dice_overlay.dart

  world/
    dice_world.dart
    dice_body.dart
    die_geometry.dart
    d6_geometry.dart

  sim/
    facsimile_dice_simulator.dart

  render/
    projected_dice_renderer.dart
    d6_face_painter.dart
```

## `main.dart`

```dart
import 'package:flutter/material.dart';

import 'roll_demo_app.dart';

void main() {
  runApp(const RollDemoApp());
}
```

## `roll_demo_app.dart`

```dart
import 'package:flutter/material.dart';
import 'package:mythic_dice_parser/mythic_dice_parser.dart';

import 'lifecycle/overlay_dice_roller.dart';
import 'lifecycle/roll_authority.dart';
import 'overlay/dice_overlay_controller.dart';

class RollDemoApp extends StatelessWidget {
  const RollDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mythic Dice 3D Experiment',
      theme: ThemeData(useMaterial3: true),
      home: const RollDemoScreen(),
    );
  }
}

class RollDemoScreen extends StatefulWidget {
  const RollDemoScreen({super.key});

  @override
  State<RollDemoScreen> createState() => _RollDemoScreenState();
}

class _RollDemoScreenState extends State<RollDemoScreen> {
  final _expressionController =
      TextEditingController(text: '2d6 @type=fire @source=spell');

  RollSummary? _lastSummary;
  String? _error;

  late final DiceOverlayController _overlayController;
  var _overlayControllerInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_overlayControllerInitialized) return;
    _overlayController = DiceOverlayController(context);
    _overlayControllerInitialized = true;
  }

  Future<void> _roll({int? seed}) async {
    setState(() {
      _error = null;
      _lastSummary = null;
    });

    try {
      final authority = SeededRngRollAuthority.seed(seed ?? DateTime.now().microsecondsSinceEpoch);

      final roller = OverlayDiceRoller(
        authority: authority,
        overlayController: _overlayController,
      );

      final dice = DiceExpression.create(
        _expressionController.text,
        roller: roller,
      );

      final summary = await dice.roll();

      setState(() => _lastSummary = summary);
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _lastSummary;

    return Scaffold(
      appBar: AppBar(title: const Text('Mythic Dice Parser: 3D Roll Experiment')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Underlying app UI remains visible during the overlay roll.',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _expressionController,
            decoration: const InputDecoration(
              labelText: 'Dice expression',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton(
                onPressed: () {
                  _expressionController.text = '1d6';
                  _roll();
                },
                child: const Text('Roll 1d6'),
              ),
              FilledButton(
                onPressed: () {
                  _expressionController.text = '2d6 @type=fire @source=spell';
                  _roll();
                },
                child: const Text('Roll 2d6'),
              ),
              OutlinedButton(
                onPressed: () => _roll(seed: 42),
                child: const Text('Seeded roll'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          if (_error != null)
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          if (summary != null) ...[
            Text('Total: ${summary.total}', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text('Results: ${summary.results}'),
            Text('Discarded: ${summary.discarded}'),
            Text('Groups: ${summary.groups}'),
            Text('Detailed: ${summary.detailedResults}'),
          ],
          const SizedBox(height: 48),
          for (var i = 0; i < 8; i++)
            Card(
              child: ListTile(
                title: Text('Underlying app card ${i + 1}'),
                subtitle: const Text('Used to verify transparent overlay behavior.'),
              ),
            ),
        ],
      ),
    );
  }
}
```

## Roll authority

```dart
import 'dart:math';

import 'package:mythic_dice_parser/mythic_dice_parser.dart';

enum RollAuthorityMode {
  rng,
  simulation,
  hybrid,
}

abstract class RollAuthority {
  RollAuthorityMode get mode;

  Future<List<int>> resolveInts({
    required int ndice,
    required int nsides,
    required int min,
    required DieType dieType,
  });
}

class SeededRngRollAuthority implements RollAuthority {
  SeededRngRollAuthority.seed(int seed) : _random = Random(seed);

  final Random _random;

  @override
  RollAuthorityMode get mode => RollAuthorityMode.rng;

  @override
  Future<List<int>> resolveInts({
    required int ndice,
    required int nsides,
    required int min,
    required DieType dieType,
  }) async {
    return List.generate(ndice, (_) => min + _random.nextInt(nsides));
  }
}
```

## Overlay-backed roller

```dart
import 'package:mythic_dice_parser/mythic_dice_parser.dart';

import '../overlay/dice_overlay_controller.dart';
import '../world/dice_world.dart';
import 'roll_authority.dart';

class OverlayDiceRoller implements DiceRoller {
  OverlayDiceRoller({
    required this.authority,
    required this.overlayController,
  });

  final RollAuthority authority;
  final DiceOverlayController overlayController;

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

    final world = DiceWorldFactory.d6s(values: values, dieType: dieType);
    await overlayController.roll(world);

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

    final world = DiceWorldFactory.d6s(
      values: indexes.map((i) => i + 1).toList(),
      dieType: dieType,
    );

    await overlayController.roll(world);

    for (final index in indexes) {
      yield vals[index];
    }
  }
}
```

For non-d6 named dice, the fallback/control prototype can still yield valid values while showing a placeholder d6 or flat token. The validation target should be d6 first.

## Overlay controller

```dart
import 'dart:async';

import 'package:flutter/material.dart';

import '../world/dice_world.dart';
import 'dice_overlay.dart';

class DiceOverlayController {
  DiceOverlayController(this.context);

  final BuildContext context;
  OverlayEntry? _entry;

  Future<void> roll(DiceWorld world) async {
    if (_entry != null) return;

    final completer = Completer<void>();

    final entry = OverlayEntry(
      builder: (_) {
        return Positioned.fill(
          child: DiceOverlay(
            world: world,
            onCompleted: () {
              if (!completer.isCompleted) {
                completer.complete();
              }
            },
          ),
        );
      },
    );

    _entry = entry;
    Overlay.of(context).insert(entry);

    try {
      await completer.future;
    } finally {
      entry.remove();
      if (identical(_entry, entry)) {
        _entry = null;
      }
    }
  }
}
```

## Overlay widget

```dart
import 'package:flutter/material.dart';

import '../render/projected_dice_renderer.dart';
import '../sim/facsimile_dice_simulator.dart';
import '../world/dice_world.dart';

class DiceOverlay extends StatefulWidget {
  const DiceOverlay({
    super.key,
    required this.world,
    required this.onCompleted,
  });

  final DiceWorld world;
  final VoidCallback onCompleted;

  @override
  State<DiceOverlay> createState() => _DiceOverlayState();
}

class _DiceOverlayState extends State<DiceOverlay>
    with SingleTickerProviderStateMixin {
  late final FacsimileDiceSimulator _simulator;

  @override
  void initState() {
    super.initState();

    _simulator = FacsimileDiceSimulator(vsync: this);

    _simulator.run(
      world: widget.world,
      duration: const Duration(milliseconds: 1300),
      onTick: () => setState(() {}),
    ).then((_) async {
      await Future<void>.delayed(const Duration(milliseconds: 350));
      widget.onCompleted();
    });
  }

  @override
  void dispose() {
    _simulator.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: false,
      child: Container(
        color: Colors.black.withValues(alpha: 0.08),
        child: CustomPaint(
          painter: ProjectedDiceRenderer(widget.world),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}
```

## Animate one or more d6s

The first simulator should do this:

```dart
class FacsimileDiceSimulator {
  FacsimileDiceSimulator({required TickerProvider vsync})
      : _controller = AnimationController(vsync: vsync);

  final AnimationController _controller;

  Future<void> run({
    required DiceWorld world,
    required Duration duration,
    required VoidCallback onTick,
  }) async {
    _controller.duration = duration;

    _controller.addListener(() {
      final t = Curves.easeOutCubic.transform(_controller.value);

      for (final body in world.bodies) {
        final localT = ((t - body.stagger) / (1.0 - body.stagger)).clamp(0.0, 1.0);

        body.position = body.path.positionAt(localT);

        final tumble = body.randomSpin.rotationAt(localT);
        final target = body.geometry.settleOrientationForValue(body.targetValue);

        final settleT = ((localT - 0.68) / 0.32).clamp(0.0, 1.0);
        body.rotation = Quaternion.slerp(
          tumble,
          target,
          Curves.easeOut.transform(settleT),
        );

        if (localT >= 1.0) {
          body.rotation = target;
          body.state = DiceBodyState.resolved;
        }
      }

      onTick();
    });

    await _controller.forward(from: 0);
  }

  void dispose() => _controller.dispose();
}
```

The renderer should sort dice by depth and draw each d6 with a shadow, three visible faces, and pips.

The crucial invariant:

```dart
assert(
  body.geometry.valueForWorldUpFace(body.rotation) == body.targetValue,
);
```

Use the assert in debug builds and a unit test in `test/d6_face_mapping_test.dart`.

## Force or resolve a final face value

For the fallback/control prototype, values are authoritative before animation:

```dart
final values = await authority.resolveInts(...);
```

Each `DiceBody` stores:

```dart
targetValue: values[index],
targetOrientation: geometry.settleOrientationForValue(values[index]),
```

The facsimile may spin randomly, but during the final 30% it interpolates to `targetOrientation`. The final frame snaps exactly to that orientation. That prevents mismatch between the visible face and `RollSummary`.

## Feed the final value back into `CallbackDiceRoller`

The conceptual `CallbackDiceRoller` integration should look like this:

```dart
final roller = CallbackDiceRoller(
  rollCallback: ({
    required ndice,
    required nsides,
    required min,
    required dieType,
  }) async {
    final values = await authority.resolveInts(
      ndice: ndice,
      nsides: nsides,
      min: min,
      dieType: dieType,
    );

    final world = DiceWorldFactory.d6s(values: values, dieType: dieType);
    await overlayController.roll(world);

    return values;
  },
  rollValsCallback: <T>(ndice, vals, {required dieType}) async {
    // Custom-vals rolls are not expected in this integration;
    // delegate to a simple random selection.
    final random = Random();
    return List<T>.generate(ndice, (_) => vals[random.nextInt(vals.length)]);
  },
);
```

If the existing `CallbackDiceRoller` API differs, the experiment-local `OverlayDiceRoller implements DiceRoller` above is still valid because it uses the current `DiceRoller` contract directly.

---

# 6. Validation Checklist

## Rendering

* [ ] App launches on at least one desktop target and one mobile or web target.
* [ ] Overlay renderer is not blank.
* [ ] Underlying app UI remains visible behind the roll.
* [ ] Dice are visibly separated from the background through shadow, scale, or contrast.
* [ ] Multiple dice do not fully overlap at rest.

## Motion

* [ ] Dice translate across the overlay.
* [ ] Dice rotate around more than one axis.
* [ ] Dice bounce or ease into the final position.
* [ ] Dice settle rather than stopping abruptly.
* [ ] Seeded mode produces repeatable paths.

## Authority and face mapping

* [ ] For every d6 value 1–6, `settleOrientationForValue(value)` resolves back to the same value.
* [ ] Final visible face matches the value yielded by the roller.
* [ ] The app never displays a visual face that disagrees with `RollSummary`.
* [ ] `rollVals<T>` works for named die values or produces an explicit unsupported-visual fallback.

## Parser integration

* [ ] `DiceExpression.create('1d6', roller: overlayRoller)` works.
* [ ] `await dice.roll()` waits until the overlay animation completes.
* [ ] `RollSummary.total` matches the yielded values.
* [ ] `RollSummary.results` contains `RolledDie` objects, not plain display-only values.
* [ ] `RollSummary.detailedResults` still includes die metadata.
* [ ] Existing root package tests continue to pass.

## Overlay behavior

* [ ] Overlay appears above the current screen without route navigation.
* [ ] Overlay can be removed cleanly after completion.
* [ ] Repeated rolls do not leak old `OverlayEntry` objects.
* [ ] App handles quick repeated taps safely.
* [ ] Overlay works in portrait, landscape, resizable desktop window, and web viewport.

## Groups, tags, and effects

* [ ] Group label renders for grouped expressions.
* [ ] Tags are available to the visual layer.
* [ ] `@type=fire` or equivalent tag changes visual accent.
* [ ] Discarded dice can be visually faded or marked.
* [ ] Explosion metadata can trigger a follow-up visual die.
* [ ] Reroll metadata can show old and new values.
* [ ] Locked dice can remain fixed in future push/reroll flows.

## Platform checks

* [ ] `flutter run -d chrome`
* [ ] `flutter run -d macos` or `flutter run -d windows` / `linux`
* [ ] `flutter run -d ios` or `flutter run -d android`
* [ ] Resize desktop window during roll.
* [ ] Rotate mobile device during or between rolls.
* [ ] Confirm no renderer-specific shader compilation dependency exists in the fallback/control prototype.

---

# 7. Risks and Decisions

## Risk: facsimile quality may not be beautiful enough

The stable Flutter facsimile path may look less convincing than real mesh/PBR dice. The experiment resolves this by producing a visible recording-quality prototype quickly. If the facsimile fails the visual bar, the lifecycle and overlay code are still useful, and the next renderer spike should be `flutter_scene`.

Decision to defer: whether final production dice use projected Flutter rendering, Flutter Scene, or a custom Flutter GPU renderer.

## Risk: `flutter_scene` is attractive but too early for the first stable example

`flutter_scene` has the right long-term shape for real geometry, glTF assets, PBR materials, and animation, but the current package requires Flutter master and experimental asset features. That makes it risky as the first repo experiment, especially for a shared package that should remain easy to run. ([Dart packages][3])

Decision to defer: start a `scene_renderer_spike` only after the stable overlay lifecycle proves value.

## Risk: `flame_3d` fails the cross-platform core requirement today

`flame_3d` currently excludes Windows, Linux, and Web and describes itself as experimental. It may become useful, but the fallback/control path cannot make a mobile/macOS-only renderer its core plan. ([Dart packages][2])

Decision to defer: revisit `flame_3d` if its platform matrix changes.

## Risk: physics engines are credible but integration-heavy

Rapier is a credible physics engine with Rust and JS/WASM packages, and Bullet is a proven C++ engine, but neither is a low-friction Flutter renderer-plus-physics answer today. Flutter native interop is possible through FFI and native build hooks, but that should be a dedicated physics spike, not the first overlay experiment. ([Rapier][13])

Decision to defer: choose between Rapier, Bullet, Jolt, Oimo, or Cannon only after the renderer/lifecycle contract is proven.

## Risk: visual face and authoritative result can diverge

This is the highest product risk for an RNG-authoritative facsimile. The mitigation is strict: the renderer must consume `targetValue`, the simulator must snap to `settleOrientationForValue(targetValue)`, and tests must assert face mapping for every d6 value.

Decision now: no visual-only random face selection. The visual face must derive from the same value yielded back into Mythic Dice Parser.

## Risk: adding Flutter code pollutes the pure Dart package

Avoid this by keeping all Flutter experiment files under `example/dice_3d_experiment/`. Do not export Flutter APIs from root `lib/` until the integration contract has been proven.

Decision now: the root package remains pure Dart.

## Risk: animation delays `await dice.roll()`

That is intentional for the experiment because the **roll lifecycle** includes visible resolution. Later APIs can expose lifecycle streams so apps can react to “values known,” “visual complete,” and “summary emitted” separately.

Decision to defer: exact public event API.

## Risk: non-d6 geometry

D6 is enough for the fallback/control experiment. D20/d12/d10 require mesh/face-normal tables and may push the renderer toward real geometry.

Decision now: d6 only, but `DieGeometry` must not hardcode d6 into the lifecycle.

---

# 8. Next Implementation Plan

## Phase 0 — Inspect and protect the existing package

Files touched:

```text
pubspec.yaml
test/
lib/
```

Steps:

```bash
dart test
dart analyze
```

Confirm:

* current Dart SDK constraint;
* exact `CallbackDiceRoller` constructor;
* current import path for `DiceExpression`, `DiceRoller`, `DieType`, and `RollSummary`;
* root package has no Flutter dependency.

Do not change root architecture in this phase.

## Phase 1 — Create the Flutter experiment app

Create:

```text
example/dice_3d_experiment/
```

Run:

```bash
cd example/dice_3d_experiment
flutter create --platforms=android,ios,macos,windows,linux,web .
```

Edit:

```text
example/dice_3d_experiment/pubspec.yaml
```

Add:

```yaml
dependencies:
  mythic_dice_parser:
    path: ../..
  vector_math: ^2.4.0
```

Then:

```bash
flutter pub get
flutter run -d chrome
```

The first commit should only prove the example app launches.

## Phase 2 — Add the demo app shell

Create:

```text
lib/main.dart
lib/roll_demo_app.dart
```

Implement:

* expression text field;
* roll buttons;
* visible underlying UI cards;
* result summary panel;
* seeded roll button.

Validation:

```bash
flutter run -d chrome
```

Expected result: app UI works without dice overlay.

## Phase 3 — Add lifecycle and authority files

Create:

```text
lib/lifecycle/roll_authority.dart
lib/lifecycle/overlay_dice_roller.dart
```

Implement:

* `RollAuthorityMode`;
* `RollAuthority`;
* `SeededRngRollAuthority`;
* `OverlayDiceRoller implements DiceRoller`.

At this point, the overlay can be stubbed:

```dart
await Future<void>.delayed(const Duration(milliseconds: 300));
```

Validation:

* `DiceExpression.create('2d6', roller: overlayRoller)` returns a real `RollSummary`;
* seeded mode repeats values.

## Phase 4 — Add dice world model

Create:

```text
lib/world/dice_world.dart
lib/world/dice_body.dart
lib/world/die_geometry.dart
lib/world/d6_geometry.dart
```

Implement:

* `DiceWorld`;
* `DiceBody`;
* `DiceBodyState`;
* `DieGeometry`;
* `D6Geometry`;
* `DiceWorldFactory.d6s(...)`.

Add:

```text
test/d6_face_mapping_test.dart
```

Validation:

```bash
flutter test test/d6_face_mapping_test.dart
```

Required assertion:

```dart
valueForWorldUpFace(settleOrientationForValue(v)) == v
```

for values 1–6.

## Phase 5 — Add transparent overlay

Create:

```text
lib/overlay/dice_overlay_controller.dart
lib/overlay/dice_overlay.dart
```

Implement:

* `OverlayEntry` insertion;
* full-screen transparent layer;
* completion callback;
* cleanup after completion.

Validation:

* overlay appears above visible app UI;
* overlay removes cleanly;
* repeated rolls do not stack stale entries.

## Phase 6 — Add facsimile simulator

Create:

```text
lib/sim/facsimile_dice_simulator.dart
```

Implement:

* `AnimationController`;
* seeded body paths;
* per-die stagger;
* spin/tumble;
* final slerp to target orientation;
* final snap to exact target orientation.

Validation:

* dice body positions and rotations update over time;
* final body state is `resolved`;
* final orientation maps to target value.

## Phase 7 — Add projected renderer

Create:

```text
lib/render/projected_dice_renderer.dart
lib/render/d6_face_painter.dart
```

Implement:

* shadow ellipse;
* projected cube or three-face d6 approximation;
* pips on visible face;
* basic depth ordering;
* group label text;
* tag accent ring.

Validation:

* visual nonblank render;
* d6 visibly rotates;
* final face matches value;
* multiple dice are visible.

## Phase 8 — Wire parser, roller, overlay, and renderer together

Update:

```text
lib/roll_demo_app.dart
lib/lifecycle/overlay_dice_roller.dart
```

Roll flow should be:

```dart
final roller = OverlayDiceRoller(
  authority: SeededRngRollAuthority.seed(seed),
  overlayController: overlayController,
);

final dice = DiceExpression.create(expression, roller: roller);
final summary = await dice.roll();
```

Validation:

* `RollSummary.total` appears only after overlay completes;
* visual value and `summary.results` agree;
* `summary.detailedResults` still exposes `RolledDie` metadata.

## Phase 9 — Add metadata visual hooks

Update:

```text
lib/world/dice_body.dart
lib/render/projected_dice_renderer.dart
lib/roll_demo_app.dart
```

Implement first-pass visual hooks:

* group label;
* `@type=fire` accent;
* discarded fade placeholder;
* explosion/reroll placeholder event markers.

Do not implement every modifier animation. The goal is to prove metadata can drive visuals.

## Phase 10 — Document prototype outcome

Create:

```text
example/dice_3d_experiment/README.md
```

Include:

```text
# Mythic Dice Parser 3D Dice Experiment

## What this proves
## What this does not prove
## Supported test targets
## Known visual limitations
## Face mapping convention
## How RollSummary integration works
## Next recommended renderer spike
```

The README should end with a clear decision:

```text
Decision after prototype:
- Keep stable facsimile renderer as production candidate, or
- Move to flutter_scene real-geometry spike, or
- Begin physics-authority spike with a dedicated simulator adapter.
```

The implementation should stop there. This experiment is not the final dice roller; it is the smallest useful proof that Mythic Dice Parser can own the **roll lifecycle**, visible **overlay roll**, and authoritative `RollSummary` together.

[1]: https://api.flutter.dev/flutter/widgets/Overlay-class.html "Overlay class - widgets library - Dart API"
[2]: https://pub.dev/packages/flame_3d "flame_3d | Flutter package"
[3]: https://pub.dev/packages/flutter_scene "flutter_scene | Flutter package"
[4]: https://pub.dev/packages/vector_math "vector_math | Dart package"
[5]: https://pub.dev/packages/flutter_shaders "flutter_shaders | Flutter package"
[6]: https://docs.flutter.dev/ui/design/graphics/fragment-shaders "Writing and using fragment shaders"
[7]: https://pub.dev/packages/flame "flame | Flutter package"
[8]: https://github.com/flutter/engine/blob/main/docs/impeller/Flutter-GPU.md "engine/docs/impeller/Flutter-GPU.md at main · flutter-team-archive/engine · GitHub"
[9]: https://pub.dev/packages/flutter_gpu_shaders "flutter_gpu_shaders | Flutter package"
[10]: https://docs.flutter.dev/perf/impeller "Impeller rendering engine"
[11]: https://pub.dev/packages/oimo_physics "oimo_physics | Flutter package"
[12]: https://pub.dev/packages/cannon_physics "cannon_physics | Flutter package"
[13]: https://rapier.rs/ "Rapier physics engine | Rapier"
[14]: https://github.com/bulletphysics/bullet3 "GitHub - bulletphysics/bullet3: Bullet Physics SDK: real-time collision detection and multi-physics simulation for VR, games, visual effects, robotics, machine learning etc. · GitHub"
[15]: https://pub.dev/packages/jolt_physics "jolt_physics | Dart package"
[16]: https://pub.dev/packages/model_viewer_plus "model_viewer_plus | Flutter package"
[17]: https://pub.dev/packages/vector_math/changelog "vector_math changelog | Dart package"
