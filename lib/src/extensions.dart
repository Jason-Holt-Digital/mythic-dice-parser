import 'package:fast_immutable_collections/fast_immutable_collections.dart';

import 'package:mythic_dice_parser/src/rolled_die.dart';

/// Convenience getters on an immutable list of [RolledDie].
extension RolledDieIListExtensions on IList<RolledDie> {
  /// Sum of all die results.
  int get sum => map((d) => d.result).fold(0, (sum, i) => sum + i);

  /// Number of dice marked as successes.
  int get successCount => where((d) => d.success).length;

  /// Number of dice marked as failures.
  int get failureCount => where((d) => d.failure).length;

  /// Number of dice marked as critical successes.
  int get critSuccessCount => where((d) => d.critSuccess).length;

  /// Number of dice marked as critical failures.
  int get critFailureCount => where((d) => d.critFailure).length;
}
