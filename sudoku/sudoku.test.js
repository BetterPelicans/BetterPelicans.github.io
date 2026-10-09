// Run with: node --test sudoku/sudoku.test.js
const assert = require("node:assert/strict");
const { test } = require("node:test");
const engine = require("./sudoku.js");

test("Version 1 replays exact published puzzle fixtures", () => {
  const fixtures = {
    "very-easy": "867000091435190276290600348029000630070024859048569702604732905002901063903480027",
    easy: "867000091405090276200000348029000600070024050008569702604732905000901003903080020",
    medium: "867000001405090270200000348029000600070024050008069700004732900000901000900080020",
    hard: "807000001405090200000000348020000600070024050008060700004730900000901000900080020"
  };
  for (const [difficulty, puzzle] of Object.entries(fixtures)) {
    const game = engine.generateSeededPuzzle(difficulty, "42", "1");
    assert.equal(Array.from(game.puzzle).join(""), puzzle);
    assert.equal(game.seed, 42);
    assert.equal(game.version, "1");
  }
});

test("Seed input is validated without truncation or collisions", () => {
  assert.equal(engine.parseSeed(" 00042 "), 42);
  assert.equal(engine.parseSeed("4294967295"), 4294967295);
  for (const seed of ["", "0", "-1", "1.5", "1e3", "0x10", "hello", "4294967296", null, undefined]) {
    assert.throws(() => engine.parseSeed(seed));
  }
  assert.throws(() => engine.generateSeededPuzzle("easy", 42, "2"), /unsupported/);
  assert.throws(() => engine.generateSeededPuzzle("unknown", 42), /difficulty/);
  for (const seed of [1, 4294967295]) {
    assert.deepEqual(engine.generateSeededPuzzle("easy", seed), engine.generateSeededPuzzle("easy", String(seed), "1"));
  }
});

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

for (const difficulty of Object.keys(engine.DIFFICULTIES).filter(key => key !== "extreme")) {
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

function maskOf(values) {
  return values.reduce((mask, value) => mask | (1 << (value - 1)), 0);
}

function verifyExtremeTrace(game, trace) {
  const board = Array.from(game.puzzle);
  const allowed = board.map((_, index) => maskOf(candidates(board, index)));
  for (const step of trace.steps) {
    for (let index = 0; index < 81; index++) {
      allowed[index] &= maskOf(candidates(board, index));
    }
    if (step.technique === "naked-single" || step.technique === "hidden-single") {
      const bit = 1 << (step.value - 1);
      assert.equal(board[step.index], 0);
      assert.ok(allowed[step.index] & bit);
      if (step.technique === "naked-single") {
        assert.equal(allowed[step.index], bit);
      } else {
        assert.deepEqual(units[step.unit].filter(index => allowed[index] & bit), [step.index]);
      }
      board[step.index] = step.value;
      continue;
    }
    let mask;
    let targets;
    if (step.technique === "locked-candidate") {
      mask = 1 << (step.value - 1);
      const positions = units[step.sourceUnit].filter(index => allowed[index] & mask);
      assert.ok(positions.length >= 2);
      assert.ok(positions.every(index => units[step.targetUnit].includes(index)));
      assert.notEqual(step.sourceUnit, step.targetUnit);
      targets = units[step.targetUnit].filter(index => !units[step.sourceUnit].includes(index));
    } else {
      assert.equal(step.technique, "naked-pair");
      mask = step.mask;
      assert.equal([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(value => mask & (1 << (value - 1))).length, 2);
      assert.deepEqual(units[step.unit].filter(index => allowed[index] === mask), step.cells);
      assert.equal(step.cells.length, 2);
      targets = units[step.unit].filter(index => !step.cells.includes(index));
    }
    const expected = targets.filter(index => allowed[index] & mask).map(index => ({ index, mask: allowed[index] & mask }));
    assert.ok(expected.length);
    assert.deepEqual(step.removals, expected);
    for (const removal of step.removals) {
      allowed[removal.index] &= ~removal.mask;
    }
  }
  assert.deepEqual(board, Array.from(game.solution));
  assert.deepEqual(board, Array.from(trace.solution));
}

test("Extreme: 50 seeds are sparse, unique, require advanced deductions and replay valid logic", () => {
  const techniques = new Set();
  for (let seed = 1; seed <= 50; seed++) {
    const game = engine.generateSeededPuzzle("extreme", seed);
    assert.equal(game.version, "2");
    assert.ok(game.clues >= 17 && game.clues < engine.DIFFICULTIES.hard.targetClues);
    assert.equal(engine.countSolutions(game.puzzle, 2), 1);
    assert.equal(engine.solveLogically(game.puzzle), null, "Hard's singles must be insufficient");
    const before = Array.from(game.puzzle);
    const trace = engine.solveExtremeLogically(game.puzzle);
    assert.ok(trace);
    assert.deepEqual(Array.from(game.puzzle), before);
    verifyExtremeTrace(game, trace);
    trace.steps.forEach(step => techniques.add(step.technique));
    // A full pass must confirm no single remaining clue can be removed while
    // keeping both the unique solution and a path under the supported rules.
    for (let index = 0; index < 81; index++) {
      if (!game.puzzle[index]) continue;
      const reduced = new Uint8Array(game.puzzle);
      reduced[index] = 0;
      assert.ok(!engine.solveExtremeLogically(reduced) || engine.countSolutions(reduced, 2) !== 1);
    }
  }
  assert.ok(techniques.has("locked-candidate"));
  assert.ok(techniques.has("naked-pair"));
});

test("Extreme seeds replay separately from version 1 and reject invalid boards", () => {
  assert.equal(Array.from(engine.generateSeededPuzzle("extreme", 42, "2").puzzle).join(""),
    "000004906107006002000010050800002000700000000093000580080090000006030700000000001");
  assert.deepEqual(engine.generateSeededPuzzle("extreme", 42), engine.generateSeededPuzzle("extreme", "42", "2"));
  assert.throws(() => engine.generateSeededPuzzle("extreme", 42, "1"), /unsupported/);
  assert.equal(engine.solveExtremeLogically(new Uint8Array(81)), null);
  assert.equal(engine.solveExtremeLogically([1, 2]), null);
  const invalid = new Uint8Array(81);
  invalid[0] = invalid[1] = 1;
  assert.equal(engine.solveExtremeLogically(invalid), null);
});
