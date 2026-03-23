import 'package:logging/logging.dart';

/// Mixin that provides a lazily-initialized [Logger] named
/// after the runtime type.
mixin LoggingMixin {
  Logger? _logger;

  /// Logger instance for the concrete class.
  Logger get logger => _logger ??= Logger(runtimeType.toString());
}
