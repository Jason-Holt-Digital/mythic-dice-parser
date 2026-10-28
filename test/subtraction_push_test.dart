import 'package:mythic_dice_parser/mythic_dice_parser.dart';
import 'package:test/test.dart';

Future<RollSummary> roll(String formula, List<int> rolls) =>
    DiceExpression.create(formula, roller: PreRolledDiceRoller(rolls)).roll();

Future<RollSummary> push(RollSummary summary, List<int> rolls) =>
    reroll(summary, roller: PreRolledDiceRoller(rolls));

/// Each die as (result, success, failure, subtracted).
List<(int, bool, bool, bool)> dice(Iterable<RolledDie> dice) => [
  for (final d in dice) (d.result, d.success, d.failure, d.subtracted),
];

void main() {
  test('a push re-rolls both scored pools of 2d6#s6 - 2d6#s6', () async {
    final summary = await roll('2d6#s6 - 2d6#s6', [6, 2, 3, 4]);

    expect(dice(summary.results), [
      (6, true, false, false),
      (2, false, false, false),
      (-3, false, false, true),
      (-4, false, false, true),
    ]);
    expect(summary.total, 1);
    expect(dice(rerollableDice(summary)), [
      (2, false, false, false),
      (-3, false, false, true),
      (-4, false, false, true),
    ]);

    final pushed = await push(summary, [5, 6, 1]);

    expect(dice(pushed.results), [
      (6, true, false, false),
      (5, false, false, false),
      (-6, true, false, true),
      (-1, false, false, true),
    ]);
    expect(pushed.total, 4);
    expect(pushed.successCount, 1, reason: 'a subtracted 6 is not counted');
    expect(dice(rerollableDice(pushed)), [
      (5, false, false, false),
      (-1, false, false, true),
    ]);
  });

  test('each side of a subtraction keeps its own @lock rule', () async {
    final summary = await roll('2d6#s6#f1 - (2d6#s6#f1 @lock=sf)', [
      6,
      1,
      3,
      1,
    ]);

    expect(dice(rerollableDice(summary)), [
      (1, false, true, false),
      (-3, false, false, true),
    ]);

    final pushed = await push(summary, [4, 5]);

    expect(dice(pushed.results), [
      (4, false, false, false),
      (6, true, false, false),
      (-1, false, true, true),
      (-5, false, false, true),
    ]);
    expect(pushed.total, 4);
  });

  test('a subtracted pool can be pushed, a multiplied one cannot', () async {
    final multiplied = await roll('2d6*2', [3, 4]);
    final subtracted = await roll('10 - 2d6', [3, 4]);

    expect(multiplied.total, 14);
    expect(rerollableDice(multiplied), isEmpty);
    expect(subtracted.total, 3);
    expect((await push(subtracted, [1, 2])).total, 7);
  });

  test('a die subtracted twice is subtracted once and not counted', () async {
    final summary = await roll('(1d6#s6) - ((1d6#s6) - (1d6#s6))', [6, 6, 6]);

    expect(dice(summary.results), [
      (6, true, false, false),
      (-6, true, false, true),
      (6, false, false, true),
    ]);
    expect(summary.total, 6);
    expect(summary.successCount, 1);
  });

  test('a subtracted die that rolled its highest face is a maximum', () async {
    final summary = await roll('2d6 - 2d6', [6, 2, 6, 3]);

    expect(dice(rerollableDice(summary, lockWhere: (d) => d.isMaxResult)), [
      (2, false, false, false),
      (-3, false, false, true),
    ]);
  });

  test('a labeled constant on the right keeps its pool', () async {
    final summary = await roll('2d6 - ("Penalty": 3)', [6, 2]);

    expect(
      summary.groups?.map((label, group) => MapEntry(label, group.total)),
      {'': 8, 'Penalty': -3},
    );
  });

  group('a count target is only the number right after the operator', () {
    test('2d6#s-2d6#s subtracts two scored pools', () async {
      final summary = await roll('2d6#s-2d6#s', [6, 2, 3, 6]);

      expect(dice(summary.results), [
        (6, true, false, false),
        (2, false, false, false),
        (-6, true, false, true),
        (-3, false, false, true),
      ]);
      expect(summary.successCount, 1);
    });

    test('a target keeps a sign written before its number', () async {
      final scored = await roll('2d6#s>=+5', [6, 5]);
      final counted = await roll('4d6#+1', [6, 5, 2, 1]);

      expect((scored.total, scored.successCount), (11, 2));
      expect(counted.total, 1);
    });

    test('4d10#>=6+2 adds 2 to the count', () async {
      expect((await roll('4d10#>=6+2', [6, 7, 2, 9])).total, 5);
    });

    test('a keep after a count needs parentheses', () async {
      expect(
        () => DiceExpression.create('2d20 #cf #cs kh').roll(),
        throwsFormatException,
      );
      expect((await roll('(2d20 #cf #cs)kh', [1, 18])).total, 18);
    });
  });
}
