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
    })
  });

  function normalizeDifficulty(difficulty) {
    var key = String(difficulty || "medium").toLowerCase();
    return DIFFICULTIES[key] ? key : "medium";
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

  function countClues(board) {
    var clues = 0;
    for (var index = 0; index < board.length; index += 1) {
      if (board[index]) {
        clues += 1;
      }
    }
    return clues;
  }

  function generatePuzzle(difficulty, random) {
    var key = normalizeDifficulty(difficulty);
    var config = DIFFICULTIES[key];
    var rng = typeof random === "function" ? random : Math.random;
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
        if (countSolutions(puzzle, 2) === 1) {
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
    createRng: createRng,
    generatePuzzle: generatePuzzle,
    countSolutions: countSolutions,
    solveBoard: solveBoard,
    isValidBoard: isValidBoard,
    countClues: countClues
  };
});
