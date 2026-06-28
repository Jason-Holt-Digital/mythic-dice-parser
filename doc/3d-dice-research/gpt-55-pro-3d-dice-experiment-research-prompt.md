# GPT 5.5 Pro Research Prompt: Mythic Dice Parser 3D Dice Experiment

You are GPT 5.5 Pro with web access. Research and produce a practical, source-backed plan for the first 3D dice experiment in the `mythic_dice_parser` repo.

Current date context: June 28, 2026.

## Project Context

Mythic Dice Parser is a Dart package intended to become the shared dice rolling capability across multiple apps: Mythic, Tome Keeper, Loom & Legends, and future apps.

This is not just a dice notation parser. The product goal is a shared dice rolling system that owns the roll lifecycle by default, including:

- parsing and resolving dice notation,
- visible 3D overlay rolls,
- structured authoritative roll outcomes,
- groups, tags, modifiers, and special effects,
- extensibility for alternate dice systems,
- future physics/simulation support,
- integration contracts for consuming apps.

The first implementation step is a small experiment: set up a very basic Flutter app surface, probably in the package's example area, to determine whether we can get convincing 3D dice rolling or a high-quality facsimile running in Flutter. The result of this experiment will constrain the later architecture.

## Current Repo Facts

The repo is currently a Dart package named `mythic_dice_parser`.

It already supports:

- `DiceExpression.create(expression, roller: optionalDiceRoller)`
- async `await dice.roll()`
- `RollSummary` with `total`, `results`, `discarded`, `groups`, `detailedResults`
- `RolledDie` objects, not plain integers
- die metadata: `result`, `nsides`, `dieType`, `potentialValues`, `discarded`, `success`, `failure`, `critSuccess`, `critFailure`, `exploded`, `explosion`, `compounded`, `penetrated`, `reroll`, `rerolled`, `totaled`, `groupLabel`, `locked`
- labeled groups, e.g. `"Attack": 2d6, "Damage": 1d8`
- tags, e.g. `2d6 @type=fire @source=spell`
- named die types, e.g. `DiceExpression.registerDieType('fate', [-1, -1, 0, 0, 1, 1])` and `4dfate`
- push/reroll via a standalone `reroll(summary, lockWhere:, roller:)`
- a pluggable `DiceRoller` abstraction
- `RNGRoller`
- `PreRolledDiceRoller`
- `CallbackDiceRoller`

Current `DiceRoller` shape:

```dart
abstract class DiceRoller {
  Stream<int> roll({
    required int ndice,
    required int nsides,
    int min = 1,
    DieType dieType = DieType.polyhedral,
  });

  Stream<T> rollVals<T>(
    int ndice,
    List<T> vals, {
    DieType dieType = DieType.polyhedral,
  });
}
```

`CallbackDiceRoller` can already wait for async external input, which means a first 3D experiment can resolve values after animation/simulation completes.

The package currently has CLI examples, but not a proper Flutter 3D dice test app. The experiment should likely add a minimal Flutter example app or Flutter sub-example, without polluting the pure Dart package core.

## Canonical Language and Constraints

Use this language and do not contradict it:

- **Mythic Dice Parser**: the shared module that defines dice rolling behavior, extensibility, visualization expectations, and the integration contract used by consumer apps.
- **Dice roller**: the user-facing capability enabled by Mythic Dice Parser for rolling dice, visualizing results, and extending what dice interactions can do.
- **Overlay roll**: the 3D dice roll presentation that appears above existing app UI while leaving the underlying interface visible.
- **Roll lifecycle**: the full sequence of trigger, animation, modifier application, resolved outcome, and emitted data for a dice roll.
- **Physics roll**: a roll mode where the dice outcome is produced through simulated physical motion.
- **RNG roll**: a roll mode where the dice outcome is produced through random-number generation rather than simulated physical resolution.
- **Physics-ready architecture**: an architecture that can add physics roll support later without a ground-up rewrite.
- **Underlying roll model**: the authoritative roll state where values, modifiers, and special effects are applied before they are presented visually.
- **Cross-platform renderer**: must work across intended platforms in one codebase. Do not make mobile-only fallback the core plan.

Hard constraints:

- Do not treat 3D dice as optional polish, an app-only concern, or a future fallback.
- Do not reduce this to "which package can we bolt on?"
- Do not recommend a WebView/model viewer as the core architecture. You may discuss WebView/model-viewer only as contrast.
- Do not say or imply this is impossible.
- If something is risky or experimental, identify the exact risk and design through it.
- Do not say "keep a renderer interface so we can maybe replace it later" as the main idea.
- Do not frame physics as fake future work. The first experiment may use RNG-authoritative animation, but the architecture must remain physics-ready.
- Be bold, but evidence-backed.

## Research Goal

Research the best way to set up the first practical 3D dice rolling experiment in this repo.

The experiment may use either:

1. real 3D dice rolling with simulated motion, or
2. a convincing 3D facsimile that animates dice and lands on authoritative values,

as long as the experiment teaches us which rendering/simulation path can support the eventual shared system.

The core question:

What is the smallest useful Flutter experiment we can build now that proves whether Mythic Dice Parser can own visible 3D dice overlay rolls in a cross-platform, beautiful, dynamic, physics-ready way while still producing authoritative structured `RollSummary` outcomes?

## Technologies To Research

Use current primary sources wherever possible. Prioritize official docs, GitHub repos, package docs, changelogs, and pub.dev pages.

Research at minimum:

- Flutter Flame
- `flame_3d`
- Flutter Scene / `flutter_scene`
- Flutter GPU
- Fragment shaders
- `flutter_shaders`
- `flutter_gpu_shaders`
- Impeller
- Flutter `InteractiveViewer`, custom painters, and transform/canvas options if relevant to a facsimile
- Dart/Flutter-compatible 3D physics options
- Rapier, Bullet, Oimo, Cannon, or other physics engines only if they are credible for this use case
- WebView/model-viewer packages only as contrast, not as recommended core

For each, answer:

- Does it work on stable Flutter today?
- What platforms does it support?
- Is it suitable for real 3D geometry?
- Is it suitable for dice face mapping?
- Is it suitable for physics or only rendering?
- Can it run in a transparent overlay above Flutter UI?
- Can it integrate with `CallbackDiceRoller` and produce authoritative values?
- What are the current risks?
- What would a one-day prototype look like?

## Required Output

Produce a research report with these sections:

1. **Executive Recommendation**
   - Pick the best first experiment path.
   - State why it is the right first experiment.
   - State what it proves and what it will not prove.

2. **Experiment Shape**
   - Where to put the app in the repo.
   - Whether to use a Flutter example app, separate package, or local `example/` subdirectory.
   - Minimal screens/widgets.
   - Minimal roll flow.
   - Minimal dependencies.

3. **Architecture Sketch**
   - `RollLifecycle`
   - `DiceWorld`
   - `DiceBody`
   - die geometry and face mapping
   - `RollAuthority` modes: RNG, simulation, hybrid
   - `DiceSimulator`
   - `DiceRenderer`
   - overlay behavior
   - modifier/special-effect mapping
   - integration with `DiceExpression` and `CallbackDiceRoller`

4. **Technology Comparison**
   - Use a comparison table.
   - Include source links for claims.
   - Do not rely on stale package impressions.

5. **Proposed First Prototype**
   - Concrete dependencies and versions if available.
   - Commands to create/run the Flutter example app.
   - File structure.
   - Pseudocode or starter code for the roll flow.
   - How to animate one or more d6s.
   - How to force or resolve a final face value.
   - How to feed the final value back into `CallbackDiceRoller`.

6. **Validation Checklist**
   - Visual nonblank rendering.
   - Dice move/rotate.
   - A roll visibly resolves.
   - Final face matches authoritative value.
   - Underlying app UI remains visible for overlay mode.
   - `RollSummary` is emitted and includes expected results.
   - Seeded/deterministic test mode.
   - Group/tag visual mapping.
   - Explosion/reroll follow-up roll behavior.
   - Mobile and desktop viewport checks.

7. **Risks and Decisions**
   - Explicit risks.
   - Which risks the experiment resolves.
   - Which risks remain for later.
   - Decisions that should wait until after the prototype.

8. **Next Implementation Plan**
   - A concrete phase-by-phase plan for an agent working in this repo.
   - Include precise files/directories to create.
   - Keep the plan scoped to the experiment, not the entire final product.

## Preferred Direction, Unless Research Proves Otherwise

The likely first experiment should be an RNG-authoritative or hybrid facsimile:

- Mythic Dice Parser determines or requests the authoritative result.
- A Flutter overlay renders 3D-looking dice that tumble and settle.
- The dice visually land on the authoritative face.
- The roll result is emitted as a real `RollSummary`.
- The experiment is structured so later physics can replace the authority/resolution step without replacing the full roll lifecycle.

But do not simply accept that preference. Verify current rendering and physics options. If a real simulation path is currently practical enough for the first experiment, recommend it.

## Output Style

Be direct and implementation-oriented. No generic Flutter advice. No marketing language. Every recommendation should be tied to a source, a repo constraint, or a concrete experiment outcome.
