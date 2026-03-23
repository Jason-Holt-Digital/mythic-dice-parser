import 'package:fast_immutable_collections/fast_immutable_collections.dart';
import 'package:mythic_dice_parser/src/ast_core.dart';
import 'package:mythic_dice_parser/src/dice_roller.dart';
import 'package:mythic_dice_parser/src/enums.dart';
import 'package:mythic_dice_parser/src/roll_result.dart';
import 'package:mythic_dice_parser/src/rolled_die.dart';
import 'package:petitparser/parser.dart';

/// roll fudge dice
class FudgeDice extends UnaryDice {
  /// Creates a fudge dice op.
  FudgeDice(super.name, super.left, super.roller);

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final ndice = lhs.totalOrDefault(() => 1);

    // redundant w/ RangeError checks in the DiceRoller. But we can construct better error messages here.
    if (ndice < DiceRoller.minDice || ndice > DiceRoller.maxDice) {
      throw FormatException(
        'Invalid number of dice ($ndice)',
        toString(),
        left.toString().length,
      );
    }
    final roll = await roller.rollFudge(ndice);
    return RollResult.fromRollResult(
      roll,
      expression: toString(),
      opType: roll.opType,
      left: lhs,
    );
  }
}

/// Custom-values dice (e.g. `1d[1,3,5,7,9]`).
class CSVDice extends UnaryDice {
  /// Creates a CSV dice op.
  CSVDice(super.name, super.left, super.roller, this.vals);

  /// The comma-separated face values.
  final SeparatedList<String, String> vals;

  @override
  String toString() => '(${left}d${vals.elements})';

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final ndice = lhs.totalOrDefault(() => 1);

    final roll = await roller.rollVals(
      ndice,
      IList(vals.elements.map(int.parse)),
    );

    return RollResult.fromRollResult(
      roll,
      expression: toString(),
      opType: OpType.rollVals,
      left: lhs,
    );
  }
}

/// Penetrating dice (NdMpX).
class PenetratingDice extends UnaryDice {
  /// Creates a penetrating dice op.
  PenetratingDice(
    super.name,
    super.left,
    super.roller, {
    required String nsides,
    required String nsidesPenetration,
  }) : nsides = int.parse(nsides),
       nsidesPenetration = nsidesPenetration.isEmpty
           ? int.parse(nsides)
           : int.parse(nsidesPenetration);

  /// Number of sides on the main die.
  final int nsides;

  /// Number of sides on the penetration re-roll die.
  final int nsidesPenetration;

  /// Maximum number of penetrations before stopping.
  final int limit = DiceRoller.defaultRerollLimit;

  @override
  String toString() => '(${left}d${nsides}p$nsidesPenetration)';

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final ndice = lhs.totalOrDefault(() => 1);

    final roll = await roller.roll(ndice, nsides);

    final results = <RolledDie>[];
    final discarded = <RolledDie>[];
    for (final (index, rolledDie) in roll.results.indexed) {
      if (rolledDie.isMaxResult) {
        var sum = rolledDie.result;
        RolledDie rerolled;
        var numPenetrated = 0;
        discarded.add(
          RolledDie.copyWith(rolledDie, discarded: true, penetrator: true),
        );
        do {
          rerolled = (await roller.roll(
            1,
            nsidesPenetration,
            '(penetration ind[$index] #${numPenetrated + 1})',
          )).results.first;
          discarded.add(
            RolledDie.copyWith(rerolled, discarded: true, penetrator: true),
          );
          sum += rerolled.result;
          numPenetrated++;
        } while (rerolled.isMaxResult && numPenetrated < limit);
        discarded.add(
          RolledDie.singleVal(
            result: -numPenetrated,
            discarded: true,
            penetrator: true,
          ),
        );
        results.add(
          RolledDie.copyWith(
            rolledDie,
            result: sum - numPenetrated,
            penetrated: true,
            from: discarded,
          ),
        );
      } else {
        results.add(rolledDie);
      }
    }

    return RollResult(
      expression: toString(),
      opType: OpType.rollPenetration,
      results: results,
      discarded: lhs.discarded + discarded,
      left: lhs,
    );
  }
}

/// roll n % dice
class PercentDice extends UnaryDice {
  /// Creates a percent dice op.
  PercentDice(super.name, super.left, super.roller);

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final ndice = lhs.totalOrDefault(() => 1);
    final roll = await roller.roll(ndice, 100);
    return RollResult.fromRollResult(
      roll,
      expression: toString(),
      opType: OpType.rollPercent,
      left: lhs,
    );
  }
}

/// roll n D66
class D66Dice extends UnaryDice {
  /// Creates a D66 dice op.
  D66Dice(super.name, super.left, super.roller);

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final ndice = lhs.totalOrDefault(() => 1);
    final roll = await roller.rollD66(ndice);
    return RollResult.fromRollResult(
      roll,
      expression: toString(),
      opType: OpType.rollD66,
      left: lhs,
    );
  }
}

/// Roll dice with faces from a named die type registry.
/// NOTE: `super.roller` is a `DiceResultRoller` (not `DiceRoller`), matching
/// the `UnaryDice` constructor signature. The parser passes its `roller`
/// variable which is already a `DiceResultRoller`.
class NamedDice extends UnaryDice {
  /// Creates a named dice op for the registered die type [dieName].
  NamedDice(super.name, super.left, super.roller, this.dieName, this.faces);

  /// The registered die type name (lowercase).
  final String dieName;

  /// The face values for this die type.
  final IList<int> faces;

  @override
  String toString() => '(${left}d$dieName)';

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final ndice = lhs.totalOrDefault(() => 1);

    final roll = await roller.rollVals(ndice, faces);

    return RollResult.fromRollResult(
      roll,
      expression: toString(),
      opType: OpType.rollVals,
      left: lhs,
    );
  }
}

/// roll N dice of Y sides.
class StdDice extends BinaryDice {
  /// Creates a standard dice op (NdM).
  StdDice(super.name, super.left, super.right, super.roller);

  @override
  String toString() => '($left$name$right)';

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final rhs = await right();
    final ndice = lhs.totalOrDefault(() => 1);
    final nsides = rhs.totalOrDefault(() => 1);

    // redundant w/ RangeError checks in the DiceRoller. But we can construct better error messages here.
    if (ndice < DiceRoller.minDice || ndice > DiceRoller.maxDice) {
      throw FormatException(
        'Invalid number of dice ($ndice)',
        toString(),
        left.toString().length,
      );
    }
    if (nsides < DiceRoller.minSides || nsides > DiceRoller.maxSides) {
      throw FormatException(
        'Invalid number of sides ($nsides)',
        toString(),
        left.toString().length + name.length + 1,
      );
    }
    final roll = await roller.roll(ndice, nsides);
    return RollResult.fromRollResult(
      roll,
      expression: toString(),
      opType: roll.opType,
      left: lhs,
      right: rhs,
    );
  }
}
