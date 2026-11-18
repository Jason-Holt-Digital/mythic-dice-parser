/// A dice expression evaluated to a count above the parser-supported maximum.
final class DiceCountLimitExceededFormatException extends FormatException {
  /// Creates a count-limit format failure.
  const new({required int count, Object? source, int? offset})
    : super('Invalid number of dice ($count)', source, offset);
}
