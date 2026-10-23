# Mythic Dice Parser

Mythic Dice Parser evaluates tabletop dice notation in pure Dart. It turns formulas such as `4d6kh3` into typed dice, discarded results, scoring flags, and an inspectable result tree. The package is `mythic_dice_parser` version **8.3.0**, as declared in `pubspec.yaml`.

## Start here

- [Getting started](getting-started.md): install dependencies and run a deterministic roll.
- [Architecture](architecture.md): follow a formula from parser to summary.
- [Glossary](glossary.md): notation and domain vocabulary.
- [Systems](../systems/index.md): grammar, operators, rollers, and results.
- [Features](../features/index.md): grouped pools, custom dice, push rules, listeners, and the example CLI.
- [Contribution guide](../how-to-contribute/index.md): change and verify the library.
- [Reference](../reference/index.md): configuration, public models, and dependencies.

## What it does

The public library entry point is `lib/mythic_dice_parser.dart`. `DiceExpression.create()` in `lib/src/dice_expression.dart` parses once; `roll()` evaluates asynchronously and returns a structured summary. Applications can inject random, prerecorded, or asynchronous external values through `lib/src/dice_roller.dart`.

The grammar in `lib/src/parser.dart` supports standard and special dice, exploding and compounding rolls, reroll modifiers, keep/drop, clamping, counts, sorting, arithmetic, labels, and tags. [Push](../features/push.md) rerolls selected dice from an existing summary without reevaluating the entire formula.

## Boundaries

This checkout contains one Dart package and two console examples, not a Flutter app or a running service. The proposed 3D runtime in `doc/3d-dice-research/00-3d-dice-direction-index.md` is research, not shipped code. See [Background](../background.md) before treating historical design documents as current API reference.

This wiki describes commit `8812e58ff3245e8d428ed08ae6810c08b92c7e2e` on `claude/clever-meitner-iyop54`. Current source and `pubspec.yaml` take precedence over older names, synchronous examples, and metadata-map descriptions still present in `README.md` and `CLAUDE.md`.
