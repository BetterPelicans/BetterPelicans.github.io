# Sudoku

Open `index.html` in a browser; there are no build dependencies.

## Difficulty and generation

| Mode | Clues | Allowed deductions |
| --- | ---: | --- |
| Very easy | 54 | Naked singles |
| Easy | 42 | Naked and hidden singles |
| Medium | 34 | Naked and hidden singles |
| Hard | 28 | Naked and hidden singles |
| Extreme | Variable, at most 27 | Singles, locked candidates and naked pairs |

A naked single is a square with only one legal candidate. A hidden single is
a number that has only one possible position in a row, column, or box.

Generation starts with a completed grid. A clue is removed only when the
remaining puzzle has exactly one solution **and** the logical solver can
finish it using the mode's allowed deductions. If generation cannot reach
the requested clue count after 30 attempts, it reports an error rather than
returning an unchecked puzzle. The logical solver never guesses or consults
the generated solution, and returns a step-by-step trace for verification.
Modes use clue counts rather than a formal human difficulty rating.

Extreme searches 16 randomized completed grids and keeps the sparsest result
that requires deductions beyond singles. Locked candidates eliminate a number
from the rest of a row, column or box when its possible positions are confined
to the intersection with another unit. Naked pairs reserve two numbers for
two squares and eliminate them from other squares in that unit.

Removal passes repeat until no remaining clue can individually be removed
while retaining uniqueness and solvability with those techniques. This is a
local minimum under the supported rules, not a global minimum. Although 17
clues is the theoretical minimum for standard uniquely solvable Sudoku, this
generator does not promise 17-clue puzzles. If the bounded search cannot find
a qualifying Extreme puzzle, it reports the limitation and asks for another
seed rather than returning an easier or unchecked puzzle.

## Replaying and sharing puzzles

Every new game displays a seed between 1 and 4294967295. To recreate it,
select the same difficulty, enter its seed, and press **Load seed**.
**New game** always chooses a fresh random seed.

**Copy puzzle link** shares the original puzzle (not your entries or notes).
The page URL updates to include the seed, difficulty, and generator version;
bookmarking or reloading that URL recreates the same starting board. The seed
and version also appear on printed puzzles.

Version 1 is a permanent compatibility contract: preserve its RNG, clue
counts, solving rules and generation order when implementing new versions.
Golden puzzle fixtures test the exact board produced in each difficulty.
Unsupported versions and invalid seeds are rejected rather than silently
loading a different puzzle.

Extreme uses version 2 with its own solver and exact-board fixture; version 1
continues to replay the original four modes unchanged.

## Printing

**Print puzzle** opens the browser print dialog for the displayed board,
including entered numbers and pencil notes. The print layout hides controls
and highlights, and uses a black-and-white grid with bold box boundaries.
Changing the difficulty selection alone does not change the printed puzzle;
use **New game** to generate a puzzle in the selected mode.

Printing, seeds and sharing are grouped in **Special options** below the
number pad. Difficulty, auto-check and undo stay above the board.

## Tests

```sh
node --test sudoku/sudoku.test.js
```

The tests check 100 reproducible seeds per original mode for exact clue counts,
uniqueness and completion, then independently replay and validate each
deduction. They also verify that a unique puzzle outside the supported
techniques is rejected by the logical solver.
For 50 Extreme seeds they independently replay candidate eliminations as well
as placements, check that singles are insufficient, and try removing every
remaining clue to verify the local minimum. Version fixtures preserve replay.
