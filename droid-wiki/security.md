# Input boundaries

The library accepts formula strings and values from injectable rollers. It does not implement authentication, authorization, or a network service. An embedding application must decide which inputs to allow and how much work a roll may consume.

## Formula input

`DiceExpression.create()` in `lib/src/dice_expression.dart` builds a grammar from `lib/src/parser.dart` and requires complete input consumption. Parse failures become `FormatException` with the input and failure position. Empty groups, empty labeled expressions, and dangling binary operators are guarded explicitly.

Some invalid operations fail only during async evaluation. For example, comparison modifiers may need a target, and standard dice validate counts and sides in `lib/src/ast_dice.dart`. Catch failures around both creation and `await expression.roll()`.

Tags are not commands or executable code. Most keys are accepted as metadata, while `push` must parse to a positive integer and `lock` must be one of `s`, `sf`, or `none`. Applications should escape labels and tag values when rendering them into another language or UI.

## Built-in bounds

`DiceRoller` defines these constants in `lib/src/dice_roller.dart`:

| Bound | Value | Meaning |
| --- | --- | --- |
| `minDice` / `maxDice` | 0 / 1,000 | Built-in per-request dice count |
| `minSides` / `maxSides` | 2 / 100,000 | Built-in standard die side count |
| `defaultRerollLimit` | 1,000 | Default per-trigger repeat cap |

`RNGRoller` and `PreRolledDiceRoller` validate their numeric request bounds. Pre-rolled standard values are range-checked, and custom-face values must belong to the supplied face list. An exhausted queue throws `PreRolledDiceRollerExhaustedException`.

These are not a single global evaluation budget. Explosions, compounding, and penetration can make repeated requests, each initial die may trigger more work, and D66 requests two d6 faces per result. Formula length, nesting depth, tree size, total callbacks, and total evaluation time have no central application-level quota.

## External rollers are trusted

`CallbackDiceRoller` in `lib/src/dice_roller.dart` yields callback results without checking the returned count or face range. Custom implementations have the same responsibility to honor the stream contract.

Validate incoming hardware, camera, manual-entry, or remote-engine values before returning them. A callback can fail, block indefinitely, or return inconsistent values. The library does not provide a cancellation protocol for those operations; application code should own timeout and cancellation behavior at the integration boundary.

Secure randomness is the library default through `Random.secure()`. A seeded `Random` is useful for reproducibility, not for secret or adversarial randomness. The example CLI defaults to pseudo-random values in `example/main.dart`.

## Push and serialization

`reroll()` in `lib/src/push.dart` does not enforce `RollSummary.pushLimit`. Compare the limit with `pushCount` before invoking another push. A caller-supplied predicate replaces tag-based selection but does not unlock already locked dice or synthetic constants.

Die JSON deliberately omits provenance, score rules, and push-lock rules in `lib/src/rolled_die.dart`. There is no model `fromJson()` API. Do not treat client-supplied JSON as a verified, complete push state.

Large history trees and provenance chains also have a memory cost. Die provenance is excluded from JSON, but `lib/src/roll_result.dart` still recursively serializes the operation tree.

## Automation boundary

GitHub workflows receive untrusted issue, PR, and log text. The native Factory authorization and classification boundaries are described in [Automation and publishing](deployment.md).

`.github/workflows/release-please.yml` is restricted to `main` and requires `RELEASE_PLEASE_TOKEN`, with no built-in-token fallback. `.github/RELEASES.md` specifies repository-scoped Contents, Pull requests, and Issues read/write access. The workflow's `contents: read` setting does not change the supplied token's permissions. The preflight checks only secret presence and repository read access; it does not verify write permissions or successful release creation.

Release Please does not use Factory or an AI service, and it creates a GitHub release and version tag but does not publish the package to a package registry; `pubspec.yaml` sets `publish_to: none`, and consumers fetch the public repository through git. Never print credentials. No actual credential values or configured permissions were inspected for this wiki.

This page documents observed boundaries, not the result of a dedicated security audit. For safe extension points, see [Rollers](systems/rollers.md) and [Patterns and conventions](how-to-contribute/patterns-and-conventions.md).
