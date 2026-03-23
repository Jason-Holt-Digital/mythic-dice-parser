import 'package:logging/logging.dart';
import 'package:mythic_dice_parser/src/dice_roller.dart';
import 'package:mythic_dice_parser/src/enums.dart';
import 'package:mythic_dice_parser/src/parser.dart';
import 'package:mythic_dice_parser/src/roll_result.dart';
import 'package:mythic_dice_parser/src/roll_summary.dart';
import 'package:mythic_dice_parser/src/stats.dart';
import 'package:petitparser/petitparser.dart';

/// An abstract expression that can be evaluated.
abstract class DiceExpression {
  /// Logger for dice expression evaluation.
  static final exprLogger = Logger('DiceExpression');

  /// Callbacks invoked for each [RollResult] during evaluation.
  static List<void Function(RollResult)> listeners = [defaultListener];

  /// Callbacks invoked for each [RollSummary] after evaluation.
  static List<void Function(RollSummary)> summaryListeners = [];

  /// Registers a listener for individual roll results.
  static void registerListener(void Function(RollResult rollResult) callback) {
    listeners.add(callback);
  }

  /// Registers a listener for roll summaries.
  static void registerSummaryListener(
    void Function(RollSummary rollSummary) callback,
  ) {
    summaryListeners.add(callback);
  }

  /// Removes all roll-result listeners.
  static void clearListeners() {
    listeners.clear();
  }

  /// Removes all summary listeners.
  static void clearSummaryListeners() {
    summaryListeners.clear();
  }

  /// Recursively walks the result tree and fires listeners.
  static void callListeners(
    RollResult? rr, {
    void Function(RollResult rr) onRoll = noopListener,
  }) {
    if (rr == null || rr.opType == OpType.value) return;
    callListeners(rr.left, onRoll: onRoll);
    callListeners(rr.right, onRoll: onRoll);
    for (final cb in listeners) {
      cb(rr);
    }
    onRoll(rr);
  }

  /// No-op roll-result listener used as default.
  static void noopListener(RollResult rollResult) {}

  /// No-op summary listener used as default.
  static void noopSummaryListener(RollSummary rollResult) {}

  /// Default listener that logs the result at `fine` level.
  static void defaultListener(RollResult rollResult) {
    exprLogger.fine(() => '$rollResult');
  }

  /// Registry of custom die types. Maps name -> face values.
  /// Populated by client at startup via [registerDieType].
  static final Map<String, List<int>> _dieTypeRegistry = {};

  /// Register a named die type for use in expressions.
  ///
  /// After registration, expressions can reference the die by name.
  /// Names are stored and matched in **lowercase only** — this avoids
  /// parser conflicts with built-in `dF` (fudge) and `D66` notation.
  /// Always use lowercase in expressions: `4dfate`, not `4dFate`.
  ///
  /// ```dart
  /// DiceExpression.registerDieType('fate', [-1, -1, 0, 0, 1, 1]);
  /// final expr = DiceExpression.create('4dfate');
  /// ```
  static void registerDieType(String name, List<int> faces) {
    if (faces.isEmpty) {
      throw ArgumentError('Die type faces must be non-empty');
    }
    if (name.isEmpty || !RegExp(r'^[a-zA-Z]+$').hasMatch(name)) {
      throw ArgumentError(
        'Die type name must be non-empty and contain only letters',
      );
    }
    final lower = name.toLowerCase();
    if (lower == 'f') {
      throw ArgumentError("Die type name 'f' is reserved for fudge dice");
    }
    _dieTypeRegistry[lower] = List.unmodifiable(faces);
  }

  /// Unregister a named die type.
  static void unregisterDieType(String name) {
    _dieTypeRegistry.remove(name.toLowerCase());
  }

  /// Clear all registered die types.
  static void clearDieTypes() {
    _dieTypeRegistry.clear();
  }

  /// Look up a registered die type. Returns null if not found.
  /// Used internally by the parser.
  static List<int>? getDieType(String name) =>
      _dieTypeRegistry[name.toLowerCase()];

  /// Parse the given input into a DiceExpression
  ///
  /// Throws [FormatException] if invalid
  static DiceExpression create(String input, {DiceRoller? roller}) {
    final builder = parserBuilder(DiceResultRoller(roller));
    final result = builder.parse(input);
    if (result is Failure) {
      throw FormatException(
        'Error parsing dice expression',
        input,
        result.position,
      );
    }
    return result.value;
  }

  /// Each DiceExpression operation is callable.
  ///
  /// When the parsed string is invoked, this is the method used.
  Future<RollResult> call();

  /// Rolls the dice expression
  ///
  /// Throws [FormatException]
  Future<RollSummary> roll({
    void Function(RollResult rollResult) onRoll = noopListener,
    void Function(RollSummary rollSummary) onSummary = noopSummaryListener,
  }) async {
    final rollResult = await this();

    callListeners(rollResult, onRoll: onRoll);

    final summary = RollSummary(detailedResults: rollResult);
    for (final cb in summaryListeners) {
      cb(summary);
    }
    onSummary(summary);
    return summary;
  }

  /// Lazy iterable of rolling [num] times. Results returned as stream.
  ///
  /// Throws [FormatException]
  Stream<RollSummary> rollN(int num) async* {
    for (var i = 0; i < num; i++) {
      yield await roll();
    }
  }

  /// Performs [num] rolls and outputs stats (stddev, mean, min/max, and a histogram)
  ///
  /// Throws [FormatException]
  Future<Map<String, dynamic>> stats({int num = 1000}) async {
    final stats = StatsCollector();

    await for (final r in rollN(num)) {
      stats.update(r.total);
    }
    return stats.toJson();
  }
}
