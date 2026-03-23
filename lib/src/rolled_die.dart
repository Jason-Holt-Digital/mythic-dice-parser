import 'package:collection/collection.dart';
import 'package:equatable/equatable.dart';
import 'package:fast_immutable_collections/fast_immutable_collections.dart';

import 'package:mythic_dice_parser/src/dice_roller.dart';
import 'package:mythic_dice_parser/src/enums.dart';

/// representation of a single dice roll result.
class RolledDie extends Equatable implements Comparable<RolledDie> {
  /// Creates a rolled die with the given [result] and [dieType].
  RolledDie({
    required this.result,
    required this.dieType,
    this.nsides = 0,
    Iterable<int> potentialValues = const IList.empty(),
    this.discarded = false,
    this.success = false,
    this.failure = false,
    this.critSuccess = false,
    this.critFailure = false,
    this.exploded = false,
    this.explosion = false,
    this.compoundedFinal = false,
    this.compounded = false,
    this.penetrated = false,
    this.penetrator = false,
    this.reroll = false,
    this.rerolled = false,
    this.clampCeiling = false,
    this.clampFloor = false,
    this.totaled = false,
    this.from = const IList.empty(),
    this.groupLabel,
    this.locked = false,
  }) : potentialValues = IList(potentialValues) {
    if (dieType.requirePotentialValues && potentialValues.isEmpty) {
      throw ArgumentError(
        'Invalid die -- ${dieType.name} must have a potentialValues field',
      );
    }
    if (dieType.requireNSides && nsides == 0) {
      throw ArgumentError(
        'Invalid die -- ${dieType.name} must have a nsides != 0',
      );
    }
    switch (dieType) {
      case DieType.polyhedral:
        maxPotentialValue = nsides;
        minPotentialValue = 1;
      case DieType.d66:
        maxPotentialValue = 66;
        minPotentialValue = 1;
      case DieType.singleVal:
        maxPotentialValue = minPotentialValue = result;
      case DieType.nvals || DieType.fudge:
        maxPotentialValue = potentialValues.max;
        minPotentialValue = potentialValues.min;
    }
  }

  /// Creates a standard polyhedral die result.
  factory RolledDie.polyhedral({
    required int result,
    required int nsides,
    bool discarded = false,
  }) => RolledDie(
    result: result,
    nsides: nsides,
    dieType: DieType.polyhedral,
    discarded: discarded,
  );

  /// Creates a fudge die result (-1, 0, or +1).
  factory RolledDie.fudge({required int result}) => RolledDie(
    result: result,
    nsides: DiceRoller.defaultFudgeVals.length,
    dieType: DieType.fudge,
    potentialValues: DiceRoller.defaultFudgeVals,
  );

  /// Creates a synthetic single-value result (e.g. a sum).
  factory RolledDie.singleVal({
    required int result,
    bool discarded = false,
    bool penetrator = false,
    bool totaled = false,
    Iterable<RolledDie>? from = const IList.empty(),
  }) => RolledDie(
    result: result,
    nsides: 1,
    discarded: discarded,
    penetrator: penetrator,
    dieType: DieType.singleVal,
    potentialValues: [result],
    totaled: totaled,
    from: IList(from),
  );

  /// Creates a D66 die result.
  factory RolledDie.d66({
    required int result,
    Iterable<RolledDie>? from = const IList.empty(),
  }) => RolledDie(result: result, dieType: DieType.d66, from: IList(from));

  /// Creates a copy of [other] with overridden fields.
  factory RolledDie.copyWith(
    RolledDie other, {
    int? result,
    bool? discarded,
    bool? success,
    bool? failure,
    bool? critSuccess,
    bool? critFailure,
    bool? exploded,
    bool? explosion,
    bool? compounded,
    bool? compoundedFinal,
    bool? penetrator,
    bool? penetrated,
    bool? reroll,
    bool? rerolled,
    bool? clampHigh,
    bool? clampLow,
    bool? totaled,
    Iterable<RolledDie>? from,
    String? groupLabel,
    bool? locked,
  }) => RolledDie(
    potentialValues: other.potentialValues,
    nsides: other.nsides,
    dieType: other.dieType,
    result: result ?? other.result,
    discarded: discarded ?? other.discarded,
    success: success ?? other.success,
    failure: failure ?? other.failure,
    penetrated: penetrated ?? other.penetrated,
    penetrator: penetrator ?? other.penetrator,
    critSuccess: critSuccess ?? other.critSuccess,
    critFailure: critFailure ?? other.critFailure,
    exploded: exploded ?? other.exploded,
    explosion: explosion ?? other.explosion,
    compounded: compounded ?? other.compounded,
    compoundedFinal: compoundedFinal ?? other.compoundedFinal,
    reroll: reroll ?? other.reroll,
    rerolled: rerolled ?? other.rerolled,
    clampCeiling: clampHigh ?? other.clampCeiling,
    clampFloor: clampLow ?? other.clampFloor,
    totaled: totaled ?? other.totaled,
    from: IList.orNull(from) ?? IList([other]),
    groupLabel: groupLabel ?? other.groupLabel,
    locked: locked ?? other.locked,
  );

  /// Creates a discarded copy of [other].
  factory RolledDie.discard(RolledDie other) =>
      RolledDie.copyWith(other, discarded: true);

  /// Marks [other] with the appropriate count flag.
  factory RolledDie.scoreForCountType(
    RolledDie other, {
    required CountType countType,
  }) => RolledDie.copyWith(
    other,
    success: other.success || countType == CountType.success,
    failure: other.failure || countType == CountType.failure,
    critSuccess: other.critSuccess || countType == CountType.critSuccess,
    critFailure: other.critFailure || countType == CountType.critFailure,
  );

  /// the rolled result
  final int result;

  /// The number of sides on the die.
  ///
  /// Generally only set if dieType == polyhedral.
  final int nsides;

  /// the maximum possible result of this die
  late final int maxPotentialValue;

  /// the minimum possible result of this die
  late final int minPotentialValue;

  /// The die faces (potential values).
  ///
  /// Empty for polyhedral rolls — values of a polyhedral
  /// die will be in the range of [1, nsides].
  final IList<int> potentialValues;

  /// true if the result has been discarded
  final bool discarded;

  /// whether the die was scored as a 'success'
  final bool success;

  /// whether the die was scored as a 'failure'
  final bool failure;

  /// whether the die was scored as a 'critical success'
  final bool critSuccess;

  /// whether the die was scored as a 'critical failure'
  final bool critFailure;

  /// the type of die
  final DieType dieType;

  /// the die that were operated on to become this die.
  final IList<RolledDie> from;

  /// true if the die exploded
  final bool exploded;

  /// true if the die is the result of a die exploding
  final bool explosion;

  /// true if the die was discarded as a roll during compounding
  final bool compounded;

  /// true if the die is the sum a multiple die due to compounding
  final bool compoundedFinal;

  /// true if the die was a discarded result during penetration
  final bool penetrator;

  /// true if the die was the result of penetration
  final bool penetrated;

  /// true if the (discarded) result is from a reroll
  final bool rerolled;

  /// true if the result is the rerolled die
  final bool reroll;

  /// true if the result has been clamped via `C>`
  final bool clampCeiling;

  /// true if the result has been clamped via `C<`
  final bool clampFloor;

  /// true if the result is a sum of other die results
  final bool totaled;

  /// The group label this die belongs to (from "Label:" syntax).
  /// null if no label was applied.
  final String? groupLabel;

  /// Whether this die is locked (will not be re-rolled during a push).
  final bool locked;

  /// Whether this die rolled its maximum possible value.
  bool get isMaxResult => result == maxPotentialValue;

  /// Whether this die has a range of possible values.
  bool get isCountable => minPotentialValue != maxPotentialValue;

  @override
  List<Object?> get props => [
    result,
    nsides,
    maxPotentialValue,
    minPotentialValue,
    potentialValues,
    dieType,
    discarded,
    success,
    failure,
    critFailure,
    critSuccess,
    exploded,
    explosion,
    compounded,
    compoundedFinal,
    reroll,
    rerolled,
    clampCeiling,
    clampFloor,
    penetrated,
    penetrator,
    totaled,
    groupLabel,
    locked,
  ];

  /// Serializes this die to a JSON-compatible map.
  Map<String, dynamic> toJson() =>
      {
        'result': result,
        'nsides': nsides,
        'potentialValues': potentialValues.toList(growable: false),
        'dieType': dieType.name,
        'discarded': discarded,
        'success': success,
        'failure': failure,
        'critSuccess': critSuccess,
        'critFailure': critFailure,
        'exploded': exploded,
        'explosion': explosion,
        'compounded': compounded,
        'compoundedFinal': compoundedFinal,
        'reroll': reroll,
        'rerolled': rerolled,
        'clampHigh': clampCeiling,
        'clampLow': clampFloor,
        'penetrated': penetrated,
        'penetrator': penetrator,
        'totaled': totaled,
        'groupLabel': groupLabel,
        'locked': locked,
      }..removeWhere(
        (k, v) =>
            v == null ||
            (v is Map && v.isEmpty) ||
            (v is Iterable && v.isEmpty) ||
            (v is int && v == 0) ||
            (v is bool && !v),
      );

  /// Returns a compact label for this die type (e.g. "d6", "dF").
  String getDieGlyph() {
    switch (dieType) {
      case DieType.polyhedral:
        return 'd$nsides';
      case DieType.fudge:
        return 'dF';
      case DieType.d66:
        return 'D66';
      case DieType.singleVal:
        return 'val';
      case DieType.nvals:
        return 'd?';
    }
  }

  /// Returns emoji glyphs representing this die's state flags.
  String getDieStateGlyphs() {
    final buffer = StringBuffer();

    if (discarded) {
      buffer.write('⛔︎');
    }
    if (rerolled) {
      buffer.write('↩');
    }
    if (reroll) {
      buffer.write('↩');
    }
    if (exploded) {
      buffer.write('💣'); //'⇪');
    }
    if (explosion) {
      buffer.write('🔥'); //'⇪');
    }
    if (penetrated) {
      buffer.write('➶');
    }
    if (penetrator) {
      buffer.write('⇡');
    }
    if (compoundedFinal) {
      buffer.write('⇈');
    }
    if (compounded) {
      buffer.write('↑');
    }
    if (clampCeiling) {
      buffer.write('⌈⌉');
    }
    if (clampFloor) {
      buffer.write('⌊⌋');
    }
    if (totaled) {
      buffer.write('∑');
    }
    if (success) {
      buffer.write('✓');
    }
    if (failure) {
      buffer.write('✗');
    }
    if (critSuccess) {
      buffer.write('✅');
    }
    if (critFailure) {
      buffer.write('❌');
    }
    if (locked) {
      buffer.write('🔒');
    }
    return buffer.toString();
  }

  @override
  String toString() {
    final buffer = StringBuffer()
      ..write(result)
      ..write('(')
      ..write(getDieGlyph())
      ..write(getDieStateGlyphs())
      ..write(')');
    return buffer.toString();
  }

  @override
  int compareTo(RolledDie other) => result
      .compareTo(other.result)
      .if0(dieType.compareTo(other.dieType))
      .if0(nsides.compareTo(other.nsides))
      .if0(discarded.compareTo(other.discarded))
      .if0(success.compareTo(other.success))
      .if0(failure.compareTo(other.failure))
      .if0(critSuccess.compareTo(other.critSuccess))
      .if0(critFailure.compareTo(other.critFailure))
      .if0(exploded.compareTo(other.exploded))
      .if0(explosion.compareTo(other.explosion))
      .if0(compoundedFinal.compareTo(other.compoundedFinal))
      .if0(compounded.compareTo(other.compounded))
      .if0(reroll.compareTo(other.reroll))
      .if0(rerolled.compareTo(other.rerolled))
      .if0(clampCeiling.compareTo(other.clampCeiling))
      .if0(clampFloor.compareTo(other.clampFloor))
      .if0(locked.compareTo(other.locked));
}
