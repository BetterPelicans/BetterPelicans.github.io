// Run with: node --test sudoku/sudoku.test.js
const assert = require("node:assert/strict");
const { test } = require("node:test");
const engine = require("./sudoku.js");

function unitCells(unit) {
  return Array.from({ length: 9 }, (_, offset) => {
    if (unit < 9) return unit * 9 + offset;
    if (unit < 18) return offset * 9 + unit - 9;
    const box = unit - 18;
    return (Math.floor(box / 3) * 3 + Math.floor(offset / 3)) * 9 + (box % 3) * 3 + offset % 3;
  });
}

const units = Array.from({ length: 27 }, (_, unit) => unitCells(unit));

// Independent candidate calculation, so a broken engine cannot validate its
// own trace. Check the reason for each placement before applying it.
function candidates(board, index) {
  if (board[index]) return [];
  const used = new Set(units.filter(unit => unit.includes(index)).flat().map(cell => board[cell]));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(value => !used.has(value));
}

for (const difficulty of Object.keys(engine.DIFFICULTIES)) {
  test(`${difficulty}: 100 seeded puzzles have exact clue counts, unique solutions and valid logical paths`, () => {
    for (let seed = 1; seed <= 100; seed++) {
      const game = engine.generatePuzzle(difficulty, engine.createRng(seed));
      const context = `${difficulty}, seed ${seed}`;
      assert.equal(engine.countClues(game.puzzle), engine.DIFFICULTIES[difficulty].targetClues, context);
      assert.equal(engine.countSolutions(game.puzzle, 2), 1, context);
      const original = Array.from(game.puzzle);
      const logical = engine.solveLogically(game.puzzle, difficulty === "very-easy");
      assert.ok(logical, context);
      assert.deepEqual(Array.from(game.puzzle), original, "Solving must not change the puzzle");
      assert.equal(logical.steps.length, 81 - game.clues, context);
      const replay = original.slice();
      for (const step of logical.steps) {
        assert.equal(replay[step.index], 0, context);
        assert.ok(candidates(replay, step.index).includes(step.value), context);
        if (step.technique === "naked-single") {
          assert.deepEqual(candidates(replay, step.index), [step.value], context);
        } else {
          assert.notEqual(difficulty, "very-easy", context);
          assert.equal(step.technique, "hidden-single", context);
          assert.deepEqual(units[step.unit].filter(cell => candidates(replay, cell).includes(step.value)), [step.index], context);
        }
        replay[step.index] = step.value;
      }
      assert.deepEqual(replay, Array.from(game.solution), context);
      assert.deepEqual(Array.from(logical.solution), replay, context);
      for (const unit of units) {
        assert.equal(new Set(unit.map(cell => replay[cell])).size, 9, context);
      }
    }
  });
}

test("Unique solutions alone are insufficient: a puzzle requiring stronger techniques is rejected", () => {
  const puzzle = Array.from("100007090030020008009600500005300900010080002600004000300000010040000007007000300", Number);
  assert.equal(engine.countSolutions(puzzle, 2), 1);
  assert.equal(engine.solveLogically(puzzle), null);
  assert.equal(engine.solveLogically(new Uint8Array(81)), null);
});

test("Logical solver rejects invalid boards and handles completed boards", () => {
  assert.equal(engine.solveLogically([1, 2]), null);
  const invalid = new Uint8Array(81);
  invalid[0] = invalid[1] = 1;
  assert.equal(engine.solveLogically(invalid), null);
  const game = engine.generatePuzzle("very-easy", engine.createRng(123));
  assert.deepEqual(engine.solveLogically(game.solution).steps, []);
});

test("Seeded generation is reproducible and Very easy has substantially more clues", () => {
  assert.deepEqual(engine.generatePuzzle("very-easy", engine.createRng(42)), engine.generatePuzzle("very-easy", engine.createRng(42)));
  assert.equal(engine.DIFFICULTIES["very-easy"].targetClues - engine.DIFFICULTIES.easy.targetClues, 12);
});
