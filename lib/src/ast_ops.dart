import 'package:mythic_dice_parser/src/ast_core.dart';
import 'package:mythic_dice_parser/src/dice_roller.dart';
import 'package:mythic_dice_parser/src/die_score_rule.dart';
import 'package:mythic_dice_parser/src/enums.dart';
import 'package:mythic_dice_parser/src/roll_result.dart';
import 'package:mythic_dice_parser/src/rolled_die.dart';

/// Sort operation (ascending or descending).
class SortOp extends Unary {
  /// Creates a sort op.
  SortOp(super.name, super.left);

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final reversed = name == 'sd';

    return RollResult(
      results: reversed ? lhs.results.sortReversed() : lhs.results.sort(),
      discarded: reversed ? lhs.discarded.sortReversed() : lhs.discarded.sort(),
      opType: OpType.sort,

      expression: toString(),
      left: lhs,
    );
  }
}

/// variation on count -- count how many results from lhs are =,<,> rhs.
class CountOp extends Binary {
  /// Creates a count op.
  CountOp(
    super.name,
    super.left,
    super.right, [
    this.countType = CountType.count,
  ]) {
    if (name.startsWith('#s')) {
      countType = CountType.success;
    } else if (name.startsWith('#f')) {
      countType = CountType.failure;
    } else if (name.startsWith('#cs')) {
      countType = CountType.critSuccess;
    } else if (name.startsWith('#cf')) {
      countType = CountType.critFailure;
    } else {
      countType = CountType.count;
    }
  }

  /// The type of count being performed.
  CountType countType;

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final rhs = await right();

    // The operator name is `#`, the count type, then the comparison:
    // `#s>=`, `#cf<`, `#`.
    const bareOperators = {'#', '#s', '#f', '#cs', '#cf'};
    final comparison = switch (name) {
      '#>=' ||
      '#s>=' ||
      '#f>=' ||
      '#cs>=' ||
      '#cf>=' => CountComparison.greaterOrEqual,
      '#<=' ||
      '#s<=' ||
      '#f<=' ||
      '#cs<=' ||
      '#cf<=' => CountComparison.lessOrEqual,
      '#>' || '#s>' || '#f>' || '#cs>' || '#cf>' => CountComparison.greater,
      '#<' || '#s<' || '#f<' || '#cs<' || '#cf<' => CountComparison.less,
      '#=' || '#s=' || '#f=' || '#cs=' || '#cf=' => CountComparison.equal,
      _ => bareOperators.contains(name) ? CountComparison.equal : null,
    };
    // An invalid operator only fails once there is a die to count.
    if (lhs.results.isNotEmpty) {
      // Only a bare operator (`3d6#`, `3d6#s`) may leave out the target: a
      // plain count then counts every die, a success counts the highest
      // face, a failure the lowest.
      if (rhs.results.isEmpty && !bareOperators.contains(name)) {
        throw FormatException(
          'Invalid count operation. Missing count target',
          toString(),
          toString().length,
        );
      }
      if (comparison == null) {
        throw FormatException(
          "unknown count operation '$name'",
          toString(),
          toString().indexOf(name),
        );
      }
    }
    final rule = DieScoreRule(
      countType: countType,
      comparison: comparison ?? CountComparison.equal,
      target: rhs.results.isEmpty ? null : rhs.total,
    );
    final shouldCount = rule.matches;

    final scoredResults = lhs.results.where(shouldCount);

    if (countType == CountType.count) {
      // if counting, the count becomes the new result

      return RollResult(
        expression: toString(),
        opType: OpType.count,
        results: [
          RolledDie.singleVal(result: scoredResults.length, from: lhs.results),
        ],
        discarded: [...lhs.results.map(RolledDie.discard), ...lhs.discarded],
        left: lhs,
        right: rhs,
      );
    } else {
      // if counting success/failures, the results are updated w/ scoring

      // Every die keeps the rule, matched or not, so a push can score the
      // die that replaces it.
      final nonScoredResults = lhs.results
          .whereNot(shouldCount)
          .map((v) => RolledDie.withScoreRule(v, rule));

      return RollResult(
        expression: toString(),
        opType: OpType.count,
        results: [
          ...scoredResults.map(
            (v) => RolledDie.withScoreRule(
              RolledDie.scoreForCountType(v, countType: countType),
              rule,
            ),
          ),
          ...nonScoredResults,
        ],
        discarded: lhs.discarded,
        left: lhs,
        right: rhs,
      );
    }
  }
}

/// drop operations -- drop high/low, or drop <,>,= rhs
class DropOp extends Binary {
  /// Creates a drop op.
  DropOp(super.name, super.left, super.right);

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final rhs = await right();

    final target = rhs.totalOrDefault(() {
      throw FormatException(
        'Invalid drop operation. Missing drop target',
        toString(),
        toString().length,
      );
    });

    final Iterable<RolledDie> results;
    final Iterable<RolledDie> dropped;
    switch (name) {
      case '-<': // drop <
        results = lhs.results.where((v) => v.result >= target);
        dropped = lhs.results.where((v) => v.result < target);
      case '-<=': // drop <=
        results = lhs.results.where((v) => v.result > target);
        dropped = lhs.results.where((v) => v.result <= target);
      case '->': // drop >
        results = lhs.results.where((v) => v.result <= target);
        dropped = lhs.results.where((v) => v.result > target);
      case '->=': // drop >=
        results = lhs.results.where((v) => v.result < target);
        dropped = lhs.results.where((v) => v.result >= target);
      case '-=': // drop =
        results = lhs.results.where((v) => v.result != target);
        dropped = lhs.results.where((v) => v.result == target);
      default:
        throw FormatException(
          "unknown drop operation '$name'",
          toString(),
          toString().indexOf(name),
        );
    }

    return RollResult(
      expression: toString(),
      opType: OpType.drop,
      results: [...results],
      discarded: [...dropped.map(RolledDie.discard), ...lhs.discarded],
      left: lhs,
      right: rhs,
    );
  }
}

/// drop operations -- drop high/low, or drop <,>,= rhs
class DropHighLowOp extends Binary {
  /// Creates a drop-high/low op.
  DropHighLowOp(super.name, super.left, super.right);

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final rhs = await right();
    final sorted = lhs.results.toList()..sort();
    final numToDrop = rhs.totalOrDefault(() => 1); // if missing, assume '1'
    final Iterable<RolledDie> results;
    final Iterable<RolledDie> dropped;
    switch (name) {
      case '-h': // drop high
        results = sorted.reversed.skip(numToDrop);
        dropped = sorted.reversed.take(numToDrop);
      case '-l': // drop low
        results = sorted.skip(numToDrop);
        dropped = sorted.take(numToDrop);
      case 'kl':
        results = sorted.take(numToDrop);
        dropped = sorted.skip(numToDrop);
      case 'kh':
        results = sorted.reversed.take(numToDrop);
        dropped = sorted.reversed.skip(numToDrop);
      case 'k':
        results = sorted.reversed.take(numToDrop);
        dropped = sorted.reversed.skip(numToDrop);
      default:
        throw FormatException(
          "unknown drop operation '$name'",
          toString(),
          toString().indexOf(name),
        );
    }
    return RollResult(
      expression: toString(),
      opType: OpType.drop,
      results: [...results],
      discarded: [...dropped.map(RolledDie.discard), ...lhs.discarded],
      left: lhs,
      right: rhs,
    );
  }
}

/// clamp results of lhs to >,< rhs.
class ClampOp extends Binary {
  /// Creates a clamp op.
  ClampOp(super.name, super.left, super.right);

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final rhs = await right();
    final target = rhs.totalOrDefault(() {
      throw FormatException(
        'Invalid clamp operation. Missing clamp target',
        toString(),
        toString().length,
      );
    });

    final newResults = <RolledDie>[];
    final discarded = <RolledDie>[];
    for (final d in lhs.results) {
      // TODO(mythic): add clamped flag?
      if (name == 'c>' && d.result > target) {
        discarded.add(RolledDie.copyWith(d, discarded: true, clampHigh: true));
        newResults.add(RolledDie.copyWith(d, result: target, clampHigh: true));
      } else if (name == 'c<' && d.result < target) {
        discarded.add(RolledDie.copyWith(d, discarded: true, clampLow: true));
        newResults.add(RolledDie.copyWith(d, result: target, clampLow: true));
      } else {
        newResults.add(d);
      }
    }
    return RollResult(
      expression: toString(),
      opType: OpType.clamp,
      results: newResults,
      discarded: lhs.discarded + discarded,
      left: lhs,
      right: rhs,
    );
  }
}

/// Reroll operation (r, ro).
class RerollDice extends BinaryDice {
  /// Creates a reroll op.
  RerollDice(
    super.name,
    super.left,
    super.right,
    super.roller, {
    this.limit = DiceRoller.defaultRerollLimit,
  }) {
    if (name.startsWith('ro')) {
      limit = 1;
    }
  }

  /// Maximum number of rerolls before stopping.
  int limit;

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final rhs = await right();

    final target = rhs.totalOrDefault(() {
      throw FormatException(
        'Invalid reroll operation. Missing reroll target',
        toString(),
        toString().length,
      );
    });

    bool shouldReroll(RolledDie rolledDie) {
      final val = rolledDie.result;
      switch (name) {
        case 'r' || 'ro' || 'r=' || 'ro=':
          return val == target;
        case 'r<' || 'ro<':
          return val < target;
        case 'r>' || 'ro>':
          return val > target;
        case 'r<=' || 'ro<=':
          return val <= target;
        case 'r>=' || 'ro>=':
          return val >= target;
        default:
          throw FormatException(
            "unknown reroll operation '$name'",
            toString(),
            toString().indexOf(name),
          );
      }
    }

    final results = <RolledDie>[];
    final discarded = <RolledDie>[];
    for (final v in lhs.results) {
      if (shouldReroll(v)) {
        RolledDie rerolled;
        var rerollCount = 0;
        do {
          rerolled = (await roller.reroll(
            v,
            '(reroll #$rerollCount)',
          )).results.first;
          rerollCount++;
        } while (shouldReroll(rerolled) && rerollCount < limit);
        discarded.add(RolledDie.copyWith(v, discarded: true, rerolled: true));
        results.add(
          RolledDie.copyWith(v, result: rerolled.result, reroll: true),
        );
      } else {
        results.add(v);
      }
    }

    return RollResult(
      expression: toString(),
      opType: OpType.reroll,
      results: results,
      discarded: lhs.discarded + discarded,
      left: lhs,
      right: rhs,
    );
  }
}

/// Compounding dice operation (!!, !!o).
class CompoundingDice extends BinaryDice {
  /// Creates a compounding dice op.
  CompoundingDice(
    super.name,
    super.left,
    super.right,
    super.roller, {
    this.limit = DiceRoller.defaultRerollLimit,
  }) {
    if (name.startsWith('!!o')) {
      limit = 1;
    }
  }

  /// Maximum number of compound iterations.
  int limit;

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final rhs = await right();

    bool shouldCompound(RolledDie rolledDie) {
      final val = rolledDie.result;
      if (!rolledDie.dieType.explodable) {
        logger.finest('$rolledDie cannot compound due to dieType');
        return false;
      }
      final target = rhs.totalOrDefault(() => rolledDie.maxPotentialValue);
      switch (name) {
        case '!!' || '!!=' || '!!o' || '!!o=':
          return val == target;
        case '!!<' || '!!o<':
          return val < target;
        case '!!>' || '!!o>':
          return val > target;
        case '!!<=' || '!!o<=':
          return val <= target;
        case '!!>=' || '!!o>=':
          return val >= target;
        default:
          throw FormatException(
            "unknown compounding operation '$name'",
            toString(),
            toString().indexOf(name),
          );
      }
    }

    final results = <RolledDie>[];
    final discarded = <RolledDie>[];
    for (final (index, rolledDie) in lhs.results.indexed) {
      if (shouldCompound(rolledDie)) {
        var sum = rolledDie.result;
        RolledDie rerolled;
        var numCompounded = 0;
        discarded.add(
          RolledDie.copyWith(rolledDie, discarded: true, compounded: true),
        );
        do {
          rerolled = (await roller.reroll(
            rolledDie,
            '(compound ind[$index] #$numCompounded)',
          )).results.first;
          discarded.add(
            RolledDie.copyWith(rerolled, discarded: true, compounded: true),
          );
          sum += rerolled.result;
          numCompounded++;
        } while (shouldCompound(rerolled) && numCompounded < limit);
        results.add(
          RolledDie.copyWith(rolledDie, result: sum, compoundedFinal: true),
        );
      } else {
        results.add(rolledDie);
      }
    }

    return RollResult(
      expression: toString(),
      opType: OpType.compound,
      results: results,
      discarded: lhs.discarded + discarded,
      left: lhs,
      right: rhs,
    );
  }
}

/// Exploding dice operation (!, !o).
class ExplodingDice extends BinaryDice {
  /// Creates an exploding dice op.
  ExplodingDice(
    super.name,
    super.left,
    super.right,
    super.roller, {
    this.limit = DiceRoller.defaultRerollLimit,
  }) {
    if (name.startsWith('!o')) {
      limit = 1;
    }
  }

  /// Maximum number of explosions.
  int limit;

  @override
  Future<RollResult> eval() async {
    final lhs = await left();
    final rhs = await right();

    bool shouldExplode(RolledDie rolledDie) {
      final val = rolledDie.result;
      if (!rolledDie.dieType.explodable) {
        logger.finest('$rolledDie cannot compound due to dieType');
        return false;
      }
      final target = rhs.totalOrDefault(() => rolledDie.maxPotentialValue);
      switch (name) {
        case '!' || '!=' || '!o' || '!o=':
          return val == target;
        case '!<' || '!o<':
          return val < target;
        case '!>' || '!o>':
          return val > target;
        case '!<=' || '!o<=':
          return val <= target;
        case '!>=' || '!o>=':
          return val >= target;
        default:
          throw FormatException(
            "unknown explode operation '$name'",
            toString(),
            toString().indexOf(name),
          );
      }
    }

    final newResults = <RolledDie>[];
    for (final rolledDie in lhs.results.where(shouldExplode)) {
      newResults.add(RolledDie.copyWith(rolledDie, exploded: true));
      var numExplosions = 0;
      RolledDie rerolledDie;
      do {
        rerolledDie = (await roller.reroll(
          rolledDie,
          '(explode #${numExplosions + 1})',
        )).results.first;
        numExplosions++;
        newResults.add(RolledDie.copyWith(rerolledDie, explosion: true));
      } while (shouldExplode(rerolledDie) && numExplosions < limit);
    }

    return RollResult(
      expression: toString(),
      opType: OpType.explode,
      results: [...newResults, ...lhs.results.whereNot(shouldExplode)],
      discarded: lhs.discarded,
      left: lhs,
      right: rhs,
    );
  }
}
