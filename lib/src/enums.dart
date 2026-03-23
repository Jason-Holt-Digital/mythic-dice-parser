/// Types of die.
enum DieType implements Comparable<DieType> {
  /// Normal polyhedral (1d6, 1d20, etc).
  polyhedral(),

  /// Fudge dice (-1, 0, +1).
  fudge(requirePotentialValues: true),

  /// D66 (equivalent to `1d6*10 + 1d6`).
  d66(requireNSides: false),

  /// Custom values die, e.g. `1d[1,3,5,7,9]`.
  nvals(requirePotentialValues: true),

  /// Single value (e.g. a sum or count of dice).
  singleVal(explodable: false, requirePotentialValues: true);

  const DieType({
    this.explodable = true,
    this.requirePotentialValues = false,
    this.requireNSides = true,
  });

  /// Whether the die can be exploded.
  final bool explodable;

  /// Whether the `RolledDie` must have non-empty potentialValues.
  final bool requirePotentialValues;

  /// Whether the `RolledDie` must have non-zero nsides.
  final bool requireNSides;

  @override
  int compareTo(DieType dieType) => index.compareTo(dieType.index);
}

/// The operation type that produced a `RollResult`.
enum OpType {
  /// Leaf node representing a simple integer value.
  value,

  /// Addition operation.
  add,

  /// Subtraction operation.
  subtract,

  /// Multiplication operation.
  multiply,

  /// Count operation (#, #s, #f, #cs, #cf).
  count,

  /// Drop operation (->, -<, ->=, etc).
  drop,

  /// Clamp operation (c>, c<).
  clamp,

  /// Standard dice roll (NdM).
  rollDice,

  /// Fudge dice roll (NdF).
  rollFudge,

  /// Percent dice roll (Nd%).
  rollPercent,

  /// D66 dice roll.
  rollD66,

  /// Custom-values dice roll (Nd[...]).
  rollVals,

  /// Penetrating dice roll (NdMpX).
  rollPenetration,

  /// Reroll operation (r, ro).
  reroll,

  /// Compounding dice (!!, !!o).
  compound,

  /// Exploding dice (!, !o).
  explode,

  /// Sort operation (s, sd).
  sort,

  /// Comma-separated expression grouping.
  comma,

  /// Aggregate total operation.
  total,
}

/// The type of count operation applied to dice results.
enum CountType {
  /// Simple count of dice.
  count,

  /// Count of successes.
  success,

  /// Count of failures.
  failure,

  /// Count of critical successes.
  critSuccess,

  /// Count of critical failures.
  critFailure,
}
