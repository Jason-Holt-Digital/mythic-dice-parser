import 'package:mythic_dice_parser/src/rolled_die.dart';

/// Which dice of a pool a push keeps, from the formula's `@lock=` tag.
enum PushLock {
  /// `@lock=s`: dice counted as successes or critical successes.
  successes('s'),

  /// `@lock=sf`: dice counted as successes, critical successes, failures or
  /// critical failures.
  successesAndFailures('sf'),

  /// `@lock=none`: no die.
  none('none');

  const PushLock(this.tag);

  /// The value of the `@lock=` tag that selects this rule.
  final String tag;

  /// The rule for the `@lock=` tag value [tag], or `null` when there is none.
  static PushLock? fromTag(String? tag) =>
      values.where((lock) => lock.tag == tag).firstOrNull;

  /// Whether a push keeps [die] under this rule.
  bool locks(RolledDie die) => switch (this) {
    successes => die.success || die.critSuccess,
    successesAndFailures =>
      die.success || die.critSuccess || die.failure || die.critFailure,
    none => false,
  };
}
