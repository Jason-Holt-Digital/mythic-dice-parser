import 'package:fast_immutable_collections/fast_immutable_collections.dart';
import 'package:mythic_dice_parser/src/ast_core.dart';
import 'package:mythic_dice_parser/src/ast_dice.dart';
import 'package:mythic_dice_parser/src/ast_ops.dart';
import 'package:mythic_dice_parser/src/dice_expression.dart';
import 'package:mythic_dice_parser/src/dice_roller.dart';
import 'package:petitparser/petitparser.dart';

/// Characters that can start an arithmetic operand: an integer, a die
/// (`d6`, `dF`, `D66`, ...), or a parenthesized/aggregate group.
final Parser<String> _operandStart = pattern('0-9dD({');

/// Characters that can start a comma operand: any arithmetic operand, a
/// label, or a signed value such as `-1`.
final Parser<String> _commaOperandStart = pattern('0-9dD({"+-');

/// Matches a binary [operator] only when an operand follows it.
///
/// The primitive number parser accepts an empty string so that dice
/// modifiers can omit their count (`d6`, `4d6kh`). Comma must not inherit
/// that, or a dangling `2d6,` would parse as `2d6 , <empty>`.
Parser<String> _binaryOperator(Parser<String> operator, Parser<String> next) =>
    operator.trim().skip(after: next.and());

/// An arithmetic operator and the optional sign of its right operand.
typedef _ArithmeticOperator = ({String name, String? sign});

/// Matches an arithmetic [operator], an optional sign, and then requires an
/// operand, so `2d6+-1` parses while `2d6+` and `2d6+-` do not.
Parser<_ArithmeticOperator> _arithmeticOperator(Parser<String> operator) =>
    seq2(
      operator.trim(),
      pattern('+-').trim().optional(),
    ).skip(after: _operandStart.and()).map((v) => (name: v.$1, sign: v.$2));

/// Applies the optional [sign] to [operand] the same way a leading sign is
/// parsed (`-1` is `<empty> - 1`).
DiceExpression _signed(String? sign, DiceExpression operand) => switch (sign) {
  '-' => SubOp('-', SimpleValue(''), operand),
  '+' => AddOp('+', SimpleValue(''), operand),
  _ => operand,
};

/// Builds the PetitParser grammar for dice expressions.
Parser<DiceExpression> parserBuilder(DiceResultRoller roller) {
  final builder = ExpressionBuilder<DiceExpression>()
    // numbers
    ..primitive(
      digit()
          .star()
          .flatten(message: 'integer expected')
          .trim()
          .map(SimpleValue.new),
    );
  // parens & curlies
  builder.group()
    ..wrapper(char('(').trim(), char(')').trim(), (left, value, right) => value)
    ..wrapper(
      char('{').trim(),
      char('}').trim(),
      (left, value, right) => AggregateOp(value),
    );
  // special dice handling need to have higher precedence than 'd'
  builder.group()
    ..postfix(string('dF').trim(), (a, op) => FudgeDice(op, a, roller))
    ..postfix(string('D66').trim(), (a, op) => D66Dice(op, a, roller))
    ..postfix(string('d%').trim(), (a, op) => PercentDice(op, a, roller))
    ..postfix(
      seq4(
        char('d').trim(),
        char('[').trim(),
        (char('-').optional() & digit().plus())
            .flatten()
            .plusSeparated(char(',').trim())
            .trim(),
        char(']').trim(),
      ),
      (a, op) => CSVDice(op.toString(), a, roller, op.$3),
    )
    ..postfix(
      seq4(
        char('d').trim(),
        digit().plus().flatten().trim(),
        char('p').trim(),
        digit().plus().optional().flatten().trim(),
      ),
      (a, op) => PenetratingDice(
        op.toString(),
        a,
        roller,
        nsides: op.$2,
        nsidesPenetration: op.$4,
      ),
    )
    ..postfix(
      seq2(char('d').trim(), lowercase().plus().flatten().trim()).where((v) {
        // Only match lowercase names to avoid shadowing built-in dF/D66.
        // string('dF') is tried first in this group; if the named die
        // parser also matched uppercase, 'dFire' would be grabbed by
        // string('dF') before we get a chance, causing a parse error.
        // Names are stored lowercase in the registry anyway.
        final name = v.$2;
        return name != 'f' && DiceExpression.getDieType(name) != null;
      }),
      (a, op) {
        final faces = DiceExpression.getDieType(op.$2)!;
        return NamedDice(op.toString(), a, roller, op.$2, IList(faces));
      },
    );
  builder.group().left(
    char('d').trim(),
    (a, op, b) => StdDice(op, a, b, roller),
  );

  // compounding dice (has to be in separate group from exploding)
  builder.group().left(
    (string('!!') &
            pattern('o').optional() &
            pattern('<>').optional() &
            char('=').optional())
        .flatten()
        .trim(),
    (a, op, b) => CompoundingDice(op.toLowerCase(), a, b, roller),
  );
  builder.group()
    // reroll & reroll once
    ..left(
      (pattern('rR') &
              pattern('oO').optional() &
              pattern('<>').optional() &
              char('=').optional())
          .flatten()
          .trim(),
      (a, op, b) => RerollDice(op.toLowerCase(), a, b, roller),
    )
    // exploding
    ..left(
      (char('!') &
              pattern('oO').optional() &
              pattern('<>').optional() &
              char('=').optional())
          .flatten()
          .trim(),
      (a, op, b) => ExplodingDice(op.toLowerCase(), a, b, roller),
    )
    // cap/clamp >,<
    ..left(
      (pattern('cC') & pattern('<>').optional()).flatten().trim(),
      (a, op, b) => ClampOp(op.toLowerCase(), a, b),
    )
    // drop >=,<=,>,<
    ..left(
      (char('-') & pattern('<>') & char('=').optional()).flatten().trim(),
      (a, op, b) => DropOp(op.toLowerCase(), a, b),
    )
    ..left(
      (string('-=')).flatten().trim(),
      (a, op, b) => DropOp(op.toLowerCase(), a, b),
    )
    // drop(-) low, high
    ..left(
      (char('-') & pattern('lLhH')).flatten().trim(),
      (a, op, b) => DropHighLowOp(op.toLowerCase(), a, b),
    )
    // keep low/high
    ..left(
      (pattern('k') & pattern('lLhH').optional()).flatten().trim(),
      (a, op, b) => DropHighLowOp(op.toLowerCase(), a, b),
    );

  builder.group().left(
    _arithmeticOperator(char('*')),
    (a, op, b) => MultiplyOp(op.name, a, _signed(op.sign, b)),
  );
  builder.group()
    ..left(
      _arithmeticOperator(char('+')),
      (a, op, b) => AddOp(op.name, a, _signed(op.sign, b)),
    )
    ..left(
      _arithmeticOperator(char('-')),
      (a, op, b) => SubOp(op.name, a, _signed(op.sign, b)),
    );
  // count >=, <=, <, >, =,
  // #s, #cs, #f, #cf -- count (critical) successes / failures
  builder.group()
    ..left(
      (char('#') &
              char('c').optional() &
              pattern('sf').optional() &
              pattern('<>').optional() &
              char('=').optional())
          .flatten()
          .trim(),
      (a, op, b) => CountOp(op.toLowerCase(), a, b),
    )
    ..postfix(
      (char('s') & char('d').optional()).flatten().trim(),
      (a, op) => SortOp(op.toLowerCase(), a),
    );

  // Labels, tags, and comma — lower precedence than count/sort so that
  // each sub-expression gets scored before comma joins them.
  builder.group()
    ..prefix(
      seq3(
        char('"'),
        pattern('^"').star().flatten(),
        string('":').trim(),
      ).map((v) => v.$2),
      LabelOp.new,
    )
    ..postfix(
      seq4(
        char('@'),
        letter().plus().flatten(),
        char('='),
        pattern('^ ,)').plus().flatten(),
      ).trim(),
      (a, tag) => TagOp(a, {tag.$2: tag.$4}),
    )
    ..left(
      _binaryOperator(char(','), _commaOperandStart),
      (a, op, b) => CommaOp(op, a, b),
    );
  return builder.build().end();
}
