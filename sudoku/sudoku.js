(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SudokuEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SIZE = 9;
  var CELL_COUNT = SIZE * SIZE;
  var FULL_MASK = (1 << SIZE) - 1;
  var BIT_TO_DIGIT = new Uint8Array(1 << SIZE);
  var BIT_COUNT = new Uint8Array(1 << SIZE);

  for (var digit = 1; digit <= SIZE; digit += 1) {
    BIT_TO_DIGIT[1 << (digit - 1)] = digit;
  }
  for (var mask = 1; mask <= FULL_MASK; mask += 1) {
    BIT_COUNT[mask] = BIT_COUNT[mask >> 1] + (mask & 1);
  }

  var DIFFICULTIES = Object.freeze({
    "very-easy": Object.freeze({
      name: "Very easy",
      targetClues: 54,
      description: "Extra clues; each move needs only a single-candidate deduction."
    }),
    easy: Object.freeze({
      name: "Easy",
      targetClues: 42,
      description: "A friendly start with plenty of givens."
    }),
    medium: Object.freeze({
      name: "Medium",
      targetClues: 34,
      description: "A balanced puzzle with a little more deduction."
    }),
    hard: Object.freeze({
      name: "Hard",
      targetClues: 28,
      description: "Fewer givens and longer chains of logic."
    }),
    extreme: Object.freeze({
      name: "Extreme",
      maxClues: 27,
      description: "Minimal clues with locked candidates and naked pairs."
    })
  });

  function normalizeDifficulty(difficulty) {
    var key = String(difficulty || "medium").toLowerCase();
    return DIFFICULTIES[key] ? key : "medium";
  }

  // Version 1 is a permanent replay contract. Preserve its RNG, generation
  // order and difficulty settings when adding future generator versions.
  var GENERATOR_VERSION = "1";

  function generatorVersion(difficulty) {
    return difficulty === "extreme" ? "2" : GENERATOR_VERSION;
  }

  function parseSeed(seed) {
    var text = String(seed).trim();
    var value = Number(text);
    if (!/^\d+$/.test(text) || !Number.isInteger(value) || value < 1 || value > 4294967295) {
      throw new Error("Enter a whole-number seed from 1 to 4294967295.");
    }
    return value;
  }

  function generateSeededPuzzle(difficulty, seed, version) {
    var expectedVersion = generatorVersion(difficulty);
    if (String(version || expectedVersion) !== expectedVersion) {
      throw new Error("This puzzle uses an unsupported generator version.");
    }
    if (!Object.prototype.hasOwnProperty.call(DIFFICULTIES, difficulty)) {
      throw new Error("Choose a valid puzzle difficulty.");
    }
    var value = parseSeed(seed);
    var game = generatePuzzle(difficulty, createRng(value));
    game.seed = value;
    game.version = expectedVersion;
    return game;
  }

  function createRng(seed) {
    var state = (Number(seed) >>> 0) || 0x6d2b79f5;

    return function () {
      state = (state + 0x6d2b79f5) | 0;
      var value = Math.imul(state ^ (state >>> 15), 1 | state);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInt(random, max) {
    return Math.floor(random() * max);
  }

  function shuffle(items, random) {
    for (var i = items.length - 1; i > 0; i -= 1) {
      var swapIndex = randomInt(random, i + 1);
      var value = items[i];
      items[i] = items[swapIndex];
      items[swapIndex] = value;
    }
    return items;
  }

  function createMasks(board) {
    var rows = new Int16Array(SIZE);
    var columns = new Int16Array(SIZE);
    var boxes = new Int16Array(SIZE);

    for (var index = 0; index < CELL_COUNT; index += 1) {
      var value = board[index] | 0;
      if (value < 0 || value > SIZE) {
        return null;
      }
      if (value === 0) {
        continue;
      }

      var bit = 1 << (value - 1);
      var row = Math.floor(index / SIZE);
      var column = index % SIZE;
      var box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
      if ((rows[row] & bit) || (columns[column] & bit) || (boxes[box] & bit)) {
        return null;
      }
      rows[row] |= bit;
      columns[column] |= bit;
      boxes[box] |= bit;
    }

    return { rows: rows, columns: columns, boxes: boxes };
  }

  function candidateMask(index, masks) {
    var row = Math.floor(index / SIZE);
    var column = index % SIZE;
    var box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
    return FULL_MASK & ~(masks.rows[row] | masks.columns[column] | masks.boxes[box]);
  }

  function chooseEmptyCell(board, masks) {
    var bestIndex = -1;
    var bestMask = 0;
    var fewest = SIZE + 1;

    for (var index = 0; index < CELL_COUNT; index += 1) {
      if (board[index] !== 0) {
        continue;
      }
      var available = candidateMask(index, masks);
      var count = BIT_COUNT[available];
      if (count < fewest) {
        bestIndex = index;
        bestMask = available;
        fewest = count;
        if (count <= 1) {
          break;
        }
      }
    }

    return { index: bestIndex, mask: bestMask };
  }

  function place(board, masks, index, value) {
    var row = Math.floor(index / SIZE);
    var column = index % SIZE;
    var box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
    var bit = 1 << (value - 1);
    board[index] = value;
    masks.rows[row] |= bit;
    masks.columns[column] |= bit;
    masks.boxes[box] |= bit;
  }

  function remove(board, masks, index, value) {
    var row = Math.floor(index / SIZE);
    var column = index % SIZE;
    var box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
    var bit = 1 << (value - 1);
    board[index] = 0;
    masks.rows[row] &= ~bit;
    masks.columns[column] &= ~bit;
    masks.boxes[box] &= ~bit;
  }

  function fillBoard(board, random) {
    var masks = createMasks(board);
    if (!masks) {
      return false;
    }

    function search() {
      var choice = chooseEmptyCell(board, masks);
      if (choice.index === -1) {
        return true;
      }
      if (choice.mask === 0) {
        return false;
      }

      var candidates = [];
      for (var bit = 1; bit <= FULL_MASK; bit <<= 1) {
        if (choice.mask & bit) {
          candidates.push(BIT_TO_DIGIT[bit]);
        }
      }
      shuffle(candidates, random);

      for (var i = 0; i < candidates.length; i += 1) {
        var value = candidates[i];
        place(board, masks, choice.index, value);
        if (search()) {
          return true;
        }
        remove(board, masks, choice.index, value);
      }
      return false;
    }

    return search();
  }

  function countSolutions(board, limit) {
    var work = new Uint8Array(board);
    var masks = createMasks(work);
    if (!masks) {
      return 0;
    }

    var maximum = Math.max(1, limit || 2);

    function search() {
      var choice = chooseEmptyCell(work, masks);
      if (choice.index === -1) {
        return 1;
      }
      if (choice.mask === 0) {
        return 0;
      }

      var remaining = choice.mask;
      var total = 0;
      while (remaining) {
        var bit = remaining & -remaining;
        remaining ^= bit;
        var value = BIT_TO_DIGIT[bit];
        place(work, masks, choice.index, value);
        total += search();
        remove(work, masks, choice.index, value);
        if (total >= maximum) {
          return maximum;
        }
      }
      return total;
    }

    return search();
  }

  function solveBoard(board) {
    var work = new Uint8Array(board);
    var masks = createMasks(work);
    if (!masks) {
      return null;
    }

    function search() {
      var choice = chooseEmptyCell(work, masks);
      if (choice.index === -1) {
        return true;
      }
      if (choice.mask === 0) {
        return false;
      }

      var remaining = choice.mask;
      while (remaining) {
        var bit = remaining & -remaining;
        remaining ^= bit;
        var value = BIT_TO_DIGIT[bit];
        place(work, masks, choice.index, value);
        if (search()) {
          return true;
        }
        remove(work, masks, choice.index, value);
      }
      return false;
    }

    return search() ? work : null;
  }

  function isValidBoard(board) {
    return board && board.length === CELL_COUNT && !!createMasks(board);
  }

  // No guesses or access to the stored solution: every placement is forced by
  // the current row, column and box. The trace is a replayable solving path.
  function solveLogically(board, nakedSinglesOnly) {
    if (!isValidBoard(board)) {
      return null;
    }
    var work = new Uint8Array(board);
    var masks = createMasks(work);
    var steps = [];

    while (true) {
      var candidates = new Int16Array(CELL_COUNT);
      var emptyCount = 0;
      var next = null;
      for (var index = 0; index < CELL_COUNT; index += 1) {
        if (work[index]) {
          continue;
        }
        emptyCount += 1;
        candidates[index] = candidateMask(index, masks);
        if (!candidates[index]) {
          return null;
        }
        if (!next && BIT_COUNT[candidates[index]] === 1) {
          next = { index: index, value: BIT_TO_DIGIT[candidates[index]], technique: "naked-single" };
        }
      }
      if (!emptyCount) {
        return { solution: work, steps: steps };
      }

      if (!next && !nakedSinglesOnly) {
        for (var unit = 0; unit < 27 && !next; unit += 1) {
          var cells = [];
          for (var offset = 0; offset < SIZE; offset += 1) {
            if (unit < 9) {
              cells.push(unit * SIZE + offset);
            } else if (unit < 18) {
              cells.push(offset * SIZE + unit - 9);
            } else {
              var box = unit - 18;
              cells.push((Math.floor(box / 3) * 3 + Math.floor(offset / 3)) * SIZE +
                (box % 3) * 3 + offset % 3);
            }
          }
          for (var bit = 1; bit <= FULL_MASK && !next; bit <<= 1) {
            var onlyIndex = -1;
            var count = 0;
            for (var cell = 0; cell < cells.length; cell += 1) {
              if (candidates[cells[cell]] & bit) {
                onlyIndex = cells[cell];
                count += 1;
              }
            }
            if (count === 1) {
              next = { index: onlyIndex, value: BIT_TO_DIGIT[bit], technique: "hidden-single", unit: unit };
            }
          }
        }
      }
      if (!next) {
        return null;
      }
      place(work, masks, next.index, next.value);
      steps.push(next);
    }
  }

  function countClues(board) {
    var clues = 0;
    for (var index = 0; index < board.length; index += 1) {
      if (board[index]) {
        clues += 1;
      }
    }
    return clues;
  }

  var UNITS = [];
  for (var unit = 0; unit < 27; unit += 1) {
    var cells = [];
    for (var offset = 0; offset < SIZE; offset += 1) {
      if (unit < 9) {
        cells.push(unit * SIZE + offset);
      } else if (unit < 18) {
        cells.push(offset * SIZE + unit - 9);
      } else {
        var box = unit - 18;
        cells.push((Math.floor(box / 3) * 3 + Math.floor(offset / 3)) * SIZE + (box % 3) * 3 + offset % 3);
      }
    }
    UNITS.push(cells);
  }

  // Separate from the frozen version-1 solver to preserve existing seeds.
  function solveExtremeLogically(board) {
    if (!isValidBoard(board)) {
      return null;
    }
    var work = new Uint8Array(board);
    var masks = createMasks(work);
    var candidates = new Int16Array(CELL_COUNT);
    var steps = [];
    for (var index = 0; index < CELL_COUNT; index += 1) {
      candidates[index] = work[index] ? 0 : candidateMask(index, masks);
    }

    function eliminate(technique, indices, mask, reason) {
      var removals = [];
      indices.forEach(function (index) {
        var removed = candidates[index] & mask;
        if (removed) {
          removals.push({ index: index, mask: removed });
          candidates[index] &= ~removed;
        }
      });
      if (!removals.length) {
        return false;
      }
      reason.technique = technique;
      reason.removals = removals;
      steps.push(reason);
      return true;
    }

    while (true) {
      var empty = 0;
      var next = null;
      for (var index = 0; index < CELL_COUNT; index += 1) {
        if (work[index]) {
          candidates[index] = 0;
          continue;
        }
        empty += 1;
        candidates[index] &= candidateMask(index, masks);
        if (!candidates[index]) {
          return null;
        }
        if (!next && BIT_COUNT[candidates[index]] === 1) {
          next = { index: index, value: BIT_TO_DIGIT[candidates[index]], technique: "naked-single" };
        }
      }
      if (!empty) {
        return { solution: work, steps: steps };
      }
      for (var unit = 0; unit < UNITS.length && !next; unit += 1) {
        for (var bit = 1; bit <= FULL_MASK && !next; bit <<= 1) {
          var positions = UNITS[unit].filter(function (index) { return candidates[index] & bit; });
          if (positions.length === 1) {
            next = { index: positions[0], value: BIT_TO_DIGIT[bit], technique: "hidden-single", unit: unit };
          }
        }
      }
      if (next) {
        place(work, masks, next.index, next.value);
        steps.push(next);
        continue;
      }

      var changed = false;
      for (var unit = 0; unit < UNITS.length && !changed; unit += 1) {
        for (var bit = 1; bit <= FULL_MASK && !changed; bit <<= 1) {
          var positions = UNITS[unit].filter(function (index) { return candidates[index] & bit; });
          if (positions.length < 2 || positions.length > 3) {
            continue;
          }
          for (var target = 0; target < UNITS.length && !changed; target += 1) {
            if (target === unit || !positions.every(function (index) { return UNITS[target].indexOf(index) >= 0; })) {
              continue;
            }
            var outside = UNITS[target].filter(function (index) { return UNITS[unit].indexOf(index) < 0; });
            changed = eliminate("locked-candidate", outside, bit, { sourceUnit: unit, targetUnit: target, value: BIT_TO_DIGIT[bit] });
          }
        }
      }
      for (var unit = 0; unit < UNITS.length && !changed; unit += 1) {
        for (var cell = 0; cell < SIZE && !changed; cell += 1) {
          var pairMask = candidates[UNITS[unit][cell]];
          if (BIT_COUNT[pairMask] !== 2) {
            continue;
          }
          var pair = UNITS[unit].filter(function (index) { return candidates[index] === pairMask; });
          if (pair.length !== 2) {
            continue;
          }
          var others = UNITS[unit].filter(function (index) { return pair.indexOf(index) < 0; });
          changed = eliminate("naked-pair", others, pairMask, { unit: unit, cells: pair, mask: pairMask });
        }
      }
      if (!changed) {
        return null;
      }
    }
  }

  function generateExtremePuzzle(random) {
    var best = null;
    var indexes = [];
    for (var index = 0; index < CELL_COUNT; index += 1) {
      indexes.push(index);
    }
    // Search several grids, retaining the sparsest verified result. This is
    // bounded local minimization, not a claim of a global minimum clue count.
    for (var attempt = 0; attempt < 16; attempt += 1) {
      var solution = new Uint8Array(CELL_COUNT);
      if (!fillBoard(solution, random)) {
        continue;
      }
      var puzzle = new Uint8Array(solution);
      var changed;
      do {
        changed = false;
        shuffle(indexes, random);
        for (var i = 0; i < indexes.length; i += 1) {
          var cell = indexes[i];
          var saved = puzzle[cell];
          if (!saved) {
            continue;
          }
          puzzle[cell] = 0;
          if (solveExtremeLogically(puzzle) && countSolutions(puzzle, 2) === 1) {
            changed = true;
          } else {
            puzzle[cell] = saved;
          }
        }
      } while (changed);
      var clues = countClues(puzzle);
      // Extreme must require more than Hard's singles, as well as fewer clues.
      if (clues <= DIFFICULTIES.extreme.maxClues && !solveLogically(puzzle) && (!best || clues < best.clues)) {
        best = { difficulty: "extreme", clues: clues, puzzle: puzzle, solution: solution };
      }
    }
    if (!best) {
      throw new Error("Could not generate an Extreme puzzle using the supported logical techniques. Try another seed.");
    }
    return best;
  }

  function generatePuzzle(difficulty, random) {
    var key = normalizeDifficulty(difficulty);
    var config = DIFFICULTIES[key];
    var rng = typeof random === "function" ? random : Math.random;
    if (key === "extreme") {
      return generateExtremePuzzle(rng);
    }
    var indexes = [];

    for (var index = 0; index < CELL_COUNT; index += 1) {
      indexes.push(index);
    }

    for (var attempt = 0; attempt < 30; attempt += 1) {
      var solution = new Uint8Array(CELL_COUNT);
      if (!fillBoard(solution, rng)) {
        continue;
      }

      var puzzle = new Uint8Array(solution);
      shuffle(indexes, rng);
      var clues = CELL_COUNT;

      for (var i = 0; i < indexes.length && clues > config.targetClues; i += 1) {
        var cell = indexes[i];
        var saved = puzzle[cell];
        puzzle[cell] = 0;
        if (solveLogically(puzzle, key === "very-easy") && countSolutions(puzzle, 2) === 1) {
          clues -= 1;
        } else {
          puzzle[cell] = saved;
        }
      }

      if (clues === config.targetClues) {
        return {
          difficulty: key,
          clues: clues,
          puzzle: puzzle,
          solution: solution
        };
      }
    }

    throw new Error("Could not generate a " + config.name.toLowerCase() + " puzzle in time.");
  }

  return {
    SIZE: SIZE,
    CELL_COUNT: CELL_COUNT,
    DIFFICULTIES: DIFFICULTIES,
    GENERATOR_VERSION: GENERATOR_VERSION,
    generatorVersion: generatorVersion,
    parseSeed: parseSeed,
    generateSeededPuzzle: generateSeededPuzzle,
    createRng: createRng,
    generatePuzzle: generatePuzzle,
    countSolutions: countSolutions,
    solveBoard: solveBoard,
    solveLogically: solveLogically,
    solveExtremeLogically: solveExtremeLogically,
    isValidBoard: isValidBoard,
    countClues: countClues
  };
});
