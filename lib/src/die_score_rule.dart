import 'package:equatable/equatable.dart';
import 'package:mythic_dice_parser/src/enums.dart';
import 'package:mythic_dice_parser/src/rolled_die.dart';

/// One count operator of a formula, as it was applied to a die: `#s6`,
/// `#s>=8`, `#f`, `#cs`, `#cf<=2`, ...
///
/// The count operators use it to decide which dice they count, and every
/// scoring operator (`#s`, `#f`, `#cs`, `#cf`) records it on the dice it
/// looked at (see [RolledDie.scoreRules]), whether or not they matched. A
/// push (`reroll()`) scores each replacement die with the rules of the die
/// it replaces.
class DieScoreRule extends Equatable {
  /// Creates a rule that marks matching dice with [countType].
  const DieScoreRule({
    required this.countType,
    this.comparison = CountComparison.equal,
    this.target,
  });

  /// What the operator does with a die that matches.
  final CountType countType;

  /// How a die's result is compared with the target.
  final CountComparison comparison;

  /// The value to compare against, or `null` when the formula gave none.
  ///
  /// Without a target, a success operator (`#s`, `#cs`) matches the die's
  /// highest face, a failure operator (`#f`, `#cf`) its lowest, and a plain
  /// `#` matches every die.
  final int? target;

  /// Whether [die] is counted by this rule.
  bool matches(RolledDie die) {
    final target = this.target;
    if (target == null) {
      if (countType == CountType.count) return true;
      // A die with a single face is not a success or failure just because
      // that face is both its highest and its lowest.
      if (die.dieType.requirePotentialValues &&
          die.potentialValues.length == 1) {
        return false;
      }
      final scoresHigh =
          countType == CountType.success || countType == CountType.critSuccess;
      return die.result ==
          (scoresHigh ? die.maxPotentialValue : die.minPotentialValue);
    }
    return switch (comparison) {
      CountComparison.equal => die.result == target,
      CountComparison.less => die.result < target,
      CountComparison.lessOrEqual => die.result <= target,
      CountComparison.greater => die.result > target,
      CountComparison.greaterOrEqual => die.result >= target,
    };
  }

  /// [die] marked with [countType] when it [matches], otherwise unchanged.
  RolledDie score(RolledDie die) => matches(die)
      ? RolledDie.scoreForCountType(die, countType: countType)
      : die;

  @override
  List<Object?> get props => [countType, comparison, target];
}
