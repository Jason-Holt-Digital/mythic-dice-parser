import 'dart:math';
import 'package:mythic_dice_parser/mythic_dice_parser.dart';

void main() async {
  final r = RNGRoller(Random(1234));
  
  final explode = await DiceExpression.create('4d6!', roller: r).roll();
  print('=== 4d6! (explosion) ===');
  print('Total: ${explode.total}');
  print('Results (${explode.results.length}):');
  for (final d in explode.results) {
    print('  ${d.result} exploded=${d.exploded} explosion=${d.explosion} discarded=${d.discarded}');
  }
  print('Discarded (${explode.discarded.length}):');
  for (final d in explode.discarded) {
    print('  ${d.result} exploded=${d.exploded} explosion=${d.explosion} discarded=${d.discarded}');
  }
  
  print('\nDetailed tree:');
  void printTree(RollResult? node, int depth) {
    if (node == null) return;
    final pad = '  ' * depth;
    print('${pad}${node.opType.name}: results=${node.results.length} discarded=${node.discarded.length}');
    for (final d in node.results) {
      print('${pad}  R: ${d.result} exploded=${d.exploded} explosion=${d.explosion}');
    }
    for (final d in node.discarded) {
      print('${pad}  D: ${d.result} exploded=${d.exploded} explosion=${d.explosion}');
    }
    printTree(node.left, depth + 1);
    printTree(node.right, depth + 1);
  }
  printTree(explode.detailedResults, 0);
  
  print('\n=== 4d6!! (compound) ===');
  final r2 = RNGRoller(Random(1234));
  final compound = await DiceExpression.create('4d6!!', roller: r2).roll();
  print('Total: ${compound.total}');
  print('Results (${compound.results.length}):');
  for (final d in compound.results) {
    print('  ${d.result} compounded=${d.compounded} compoundedFinal=${d.compoundedFinal}');
  }
  print('Discarded (${compound.discarded.length}):');
  for (final d in compound.discarded) {
    print('  ${d.result} compounded=${d.compounded} compoundedFinal=${d.compoundedFinal}');
  }
  
  print('\nDetailed tree:');
  printTree(compound.detailedResults, 0);
}
