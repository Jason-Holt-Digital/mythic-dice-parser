# Custom dice

Active contributors: Jason, Steve

## Purpose

Custom dice select from an explicit list of integer faces. A formula can inline that list or use a registered lowercase name. Both routes use the same typed value-source adapter in `lib/src/dice_roller.dart`.

## Inline and named faces

```dart
final primes = await DiceExpression.create(
  '2d[2,3,5,7]',
  roller: PreRolledDiceRoller([3, 7]),
).roll();
print(primes.total); // 10

DiceExpression.registerDieType('coin', [0, 1]);
final coin = await DiceExpression.create(
  '1dcoin',
  roller: PreRolledDiceRoller([1]),
).roll();
print(coin.total); // 1
```

`DiceExpression.registerDieType()` in `lib/src/dice_expression.dart` rejects empty faces and names with anything except letters. It lowercases names, rejects reserved `f`, and stores an unmodifiable face list. Registering an existing name replaces that registry entry. `unregisterDieType()` and `clearDieTypes()` manage the shared static registry.

Expressions must use lowercase names. `lib/src/parser.dart` tries built-in `dF` before named types, and the named parser accepts lowercase letters only. Registering `Fate` permits `4dfate`, not `4dFate`.

## Key abstractions

| Type or method | Source | Role |
| --- | --- | --- |
| `registerDieType()` | `lib/src/dice_expression.dart` | Name-to-face registry |
| `CSVDice` | `lib/src/ast_dice.dart` | Inline integer list |
| `NamedDice` | `lib/src/ast_dice.dart` | Captured registered face set |
| `DiceResultRoller.rollVals()` | `lib/src/dice_roller.dart` | Wraps selected values as `nvals` dice |
| `DieType.nvals` | `lib/src/enums.dart` | Identifies custom-valued dice |

## Selection and identity

`RNGRoller.selectNFromVals()` in `lib/src/dice_roller.dart` samples list entries uniformly with replacement. Repeated values therefore act as weights: `[-1,-1,0,0,1,1]` has six entries but three distinct outcomes. A custom roller may use a different selection policy, so this weighting claim applies to the built-in RNG.

The inline list grammar accepts negative integers. Named faces are also integers; symbol rendering and labels for faces are not part of the registry. Result dice keep their potential values for later rerolls.

`NamedDice` receives its face list during parsing. Updating the registry afterward affects newly parsed formulas, not an already built expression. Register names before calling `DiceExpression.create()`.

Built-in fudge dice use `dF`; percentile uses `d%`; uppercase `D66` reads two d6 digits. These are separate parser alternatives, not registry entries. See [Operators](../systems/operators.md).

## Integration and modification

`PreRolledDiceRoller.rollVals<int>()` consumes actual face values, not list indices, and rejects values absent from the allowed list. `CallbackDiceRoller` passes the face list to the application's generic callback; the callback owns result validation. See [Rollers](../systems/rollers.md).

Extend registry validation in `lib/src/dice_expression.dart`, token syntax in `lib/src/parser.dart`, and custom-face evaluation in `lib/src/ast_dice.dart`. Preserve the lowercase/fudge conflict tests and reset the global registry between tests.

The implementation spans three principal files, shared with other dice features. Its tests are embedded in `test/dart_dice_parser_test.dart`; a separate test-to-code ratio is not meaningful.

## Key source files

| File | Purpose |
| --- | --- |
| `lib/src/dice_expression.dart` | Register, remove, clear, and look up named faces |
| `lib/src/parser.dart` | Inline-list and lowercase-name recognition |
| `lib/src/ast_dice.dart` | Custom-face AST nodes |
| `lib/src/dice_roller.dart` | RNG and external custom-face values |
| `test/dart_dice_parser_test.dart` | Registry validation and named-dice regressions |

For keeping labeled pools distinct, see [Groups and tags](groups-and-tags.md).
