(function () {
  "use strict";

  var engine = window.SudokuEngine;
  if (!engine) {
    throw new Error("SudokuEngine is not available.");
  }

  var boardElement = document.getElementById("board");
  var difficultyElement = document.getElementById("difficulty");
  var newGameButton = document.getElementById("new-game");
  var undoButton = document.getElementById("undo");
  var autoCheckElement = document.getElementById("auto-check");
  var numberPad = document.getElementById("number-pad");
  var eraseButton = document.getElementById("erase");
  var notesButton = document.getElementById("notes");
  var notesLabel = document.getElementById("notes-label");
  var notesBadge = document.getElementById("notes-badge");
  var messageElement = document.getElementById("message");
  var controlsHelp = document.getElementById("controls-help");
  var puzzleStatus = document.getElementById("puzzle-status");
  var statusDot = document.getElementById("status-dot");
  var generatingCover = document.getElementById("generating-cover");
  var cellElements = [];

  var state = {
    difficulty: difficultyElement.value,
    puzzle: null,
    solution: null,
    values: new Uint8Array(engine.CELL_COUNT),
    notes: new Uint16Array(engine.CELL_COUNT),
    selectedIndex: -1,
    history: [],
    notesMode: false,
    autoCheck: autoCheckElement.checked,
    isGenerating: false,
    isComplete: false
  };

  function rowOf(index) {
    return Math.floor(index / engine.SIZE);
  }

  function columnOf(index) {
    return index % engine.SIZE;
  }

  function boxOf(index) {
    return Math.floor(rowOf(index) / 3) * 3 + Math.floor(columnOf(index) / 3);
  }

  function isRelated(first, second) {
    return rowOf(first) === rowOf(second) ||
      columnOf(first) === columnOf(second) ||
      boxOf(first) === boxOf(second);
  }

  function createBoard() {
    for (var index = 0; index < engine.CELL_COUNT; index += 1) {
      var cell = document.createElement("button");
      var value = document.createElement("span");
      var notes = document.createElement("span");

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.index = String(index);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-selected", "false");
      cell.setAttribute("aria-label", "Empty square");
      if (columnOf(index) === 2 || columnOf(index) === 5) {
        cell.classList.add("box-right");
      }
      if (rowOf(index) === 2 || rowOf(index) === 5) {
        cell.classList.add("box-bottom");
      }

      value.className = "cell-value";
      notes.className = "cell-notes";
      for (var digit = 1; digit <= engine.SIZE; digit += 1) {
        notes.appendChild(document.createElement("span"));
      }

      cell.appendChild(value);
      cell.appendChild(notes);
      boardElement.appendChild(cell);
      cellElements.push(cell);
    }
  }

  function setMessage(text, tone) {
    messageElement.textContent = text;
    messageElement.classList.toggle("is-error", tone === "error");
    messageElement.classList.toggle("is-success", tone === "success");
  }

  function saveHistory() {
    state.history.push({
      values: new Uint8Array(state.values),
      notes: new Uint16Array(state.notes),
      selectedIndex: state.selectedIndex
    });
    if (state.history.length > 100) {
      state.history.shift();
    }
  }

  function valuesConflict() {
    var conflicts = new Uint8Array(engine.CELL_COUNT);

    function inspectUnit(indices) {
      var seen = {};
      for (var i = 0; i < indices.length; i += 1) {
        var index = indices[i];
        var value = state.values[index];
        if (!value) {
          continue;
        }
        if (!seen[value]) {
          seen[value] = [];
        }
        seen[value].push(index);
      }
      for (var key in seen) {
        if (Object.prototype.hasOwnProperty.call(seen, key) && seen[key].length > 1) {
          for (var j = 0; j < seen[key].length; j += 1) {
            conflicts[seen[key][j]] = 1;
          }
        }
      }
    }

    for (var row = 0; row < engine.SIZE; row += 1) {
      var rowIndices = [];
      for (var column = 0; column < engine.SIZE; column += 1) {
        rowIndices.push(row * engine.SIZE + column);
      }
      inspectUnit(rowIndices);
    }

    for (var columnIndex = 0; columnIndex < engine.SIZE; columnIndex += 1) {
      var columnIndices = [];
      for (var rowIndex = 0; rowIndex < engine.SIZE; rowIndex += 1) {
        columnIndices.push(rowIndex * engine.SIZE + columnIndex);
      }
      inspectUnit(columnIndices);
    }

    for (var box = 0; box < engine.SIZE; box += 1) {
      var boxIndices = [];
      var boxRow = Math.floor(box / 3) * 3;
      var boxColumn = (box % 3) * 3;
      for (var boxOffset = 0; boxOffset < 9; boxOffset += 1) {
        boxIndices.push((boxRow + Math.floor(boxOffset / 3)) * engine.SIZE + boxColumn + (boxOffset % 3));
      }
      inspectUnit(boxIndices);
    }

    if (state.autoCheck) {
      for (var index = 0; index < engine.CELL_COUNT; index += 1) {
        if (state.values[index] && !state.puzzle[index] && state.values[index] !== state.solution[index]) {
          conflicts[index] = 1;
        }
      }
    }

    return conflicts;
  }

  function describeCell(index, conflicts) {
    var value = state.values[index];
    var label;
    if (state.puzzle && state.puzzle[index]) {
      label = "Given " + state.puzzle[index];
    } else if (value) {
      label = "Entered " + value;
    } else {
      label = "Empty square";
    }
    if (conflicts[index]) {
      label += ", conflict";
    }
    if (state.notes[index] && !value) {
      label += ", notes " + notesForSpeech(state.notes[index]);
    }
    return label;
  }

  function notesForSpeech(mask) {
    var values = [];
    for (var digit = 1; digit <= engine.SIZE; digit += 1) {
      if (mask & (1 << (digit - 1))) {
        values.push(String(digit));
      }
    }
    return values.join(", ");
  }

  function render() {
    var conflicts = state.puzzle ? valuesConflict() : new Uint8Array(engine.CELL_COUNT);
    var selectedValue = state.selectedIndex >= 0 ? (state.puzzle[state.selectedIndex] || state.values[state.selectedIndex]) : 0;

    for (var index = 0; index < engine.CELL_COUNT; index += 1) {
      var cell = cellElements[index];
      var valueElement = cell.querySelector(".cell-value");
      var notesElement = cell.querySelector(".cell-notes");
      var value = state.values[index];
      var displayedValue = (state.puzzle && state.puzzle[index]) || value;
      var isGiven = !!(state.puzzle && state.puzzle[index]);

      cell.classList.toggle("is-given", isGiven);
      cell.classList.toggle("has-value", !!displayedValue);
      cell.classList.toggle("is-related", state.selectedIndex >= 0 && isRelated(state.selectedIndex, index));
      cell.classList.toggle("is-selected", state.selectedIndex === index);
      cell.classList.toggle("is-same-number", !!selectedValue && displayedValue === selectedValue);
      cell.classList.toggle("is-conflict", !!conflicts[index]);
      cell.setAttribute("aria-selected", state.selectedIndex === index ? "true" : "false");
      cell.setAttribute("aria-label", describeCell(index, conflicts));

      valueElement.textContent = displayedValue ? String(displayedValue) : "";
      for (var digit = 1; digit <= engine.SIZE; digit += 1) {
        notesElement.children[digit - 1].textContent = (!displayedValue && (state.notes[index] & (1 << (digit - 1)))) ? String(digit) : "";
      }
    }

    var hasSelection = state.selectedIndex >= 0;
    var selectedIsEditable = hasSelection && !(state.puzzle && state.puzzle[state.selectedIndex]);
    var hasSomethingToErase = selectedIsEditable && (!!state.values[state.selectedIndex] || !!state.notes[state.selectedIndex]);

    var numberButtons = numberPad.querySelectorAll("[data-number]");
    for (var buttonIndex = 0; buttonIndex < numberButtons.length; buttonIndex += 1) {
      numberButtons[buttonIndex].disabled = !selectedIsEditable || state.isGenerating || state.isComplete;
    }
    eraseButton.disabled = !hasSomethingToErase || state.isGenerating;
    notesButton.disabled = !selectedIsEditable || state.isGenerating || state.isComplete;
    undoButton.disabled = state.history.length === 0 || state.isGenerating;
    newGameButton.disabled = state.isGenerating;
    difficultyElement.disabled = state.isGenerating;
    boardElement.setAttribute("aria-busy", state.isGenerating ? "true" : "false");
    boardElement.classList.toggle("is-generating", state.isGenerating);
    generatingCover.hidden = !state.isGenerating;

    notesButton.classList.toggle("is-on", state.notesMode);
    notesButton.setAttribute("aria-pressed", state.notesMode ? "true" : "false");
    notesLabel.textContent = state.notesMode ? "Notes on" : "Notes off";
    notesBadge.textContent = state.notesMode ? "Notes on" : "Notes off";
    notesBadge.classList.toggle("is-on", state.notesMode);

    if (!hasSelection) {
      controlsHelp.textContent = "Select a square to begin";
    } else if (!selectedIsEditable) {
      controlsHelp.textContent = "Given clue · not editable";
    } else if (state.notesMode) {
      controlsHelp.textContent = "Tap a number to add or remove a note";
    } else {
      controlsHelp.textContent = "Tap a number to fill this square";
    }
  }

  function selectCell(index) {
    if (state.isGenerating) {
      return;
    }
    state.selectedIndex = index;
    if (state.puzzle[index]) {
      setMessage("That clue is fixed. Select an empty square to play.");
    } else if (state.notesMode) {
      setMessage("Notes are on. Tap numbers to mark candidates.");
    } else {
      setMessage("Choose a number from the pad.");
    }
    render();
  }

  function peersOf(index) {
    var peers = [];
    for (var candidate = 0; candidate < engine.CELL_COUNT; candidate += 1) {
      if (candidate !== index && isRelated(index, candidate)) {
        peers.push(candidate);
      }
    }
    return peers;
  }

  function updateCompletion() {
    for (var index = 0; index < engine.CELL_COUNT; index += 1) {
      var value = (state.puzzle && state.puzzle[index]) || state.values[index];
      if (value !== state.solution[index]) {
        state.isComplete = false;
        return false;
      }
    }
    state.isComplete = true;
    statusDot.classList.add("is-complete");
    setMessage("Puzzle complete — nicely done.", "success");
    return true;
  }

  function enterNumber(number) {
    if (state.isGenerating || state.isComplete || state.selectedIndex < 0) {
      return;
    }
    var index = state.selectedIndex;
    if (state.puzzle[index]) {
      setMessage("That clue is fixed. Select an empty square.", "error");
      return;
    }

    var bit = 1 << (number - 1);
    if (state.notesMode) {
      saveHistory();
      if (state.values[index]) {
        state.history.pop();
        setMessage("Erase the filled number before adding notes.", "error");
        return;
      }
      state.notes[index] ^= bit;
      setMessage(state.notes[index] & bit ? "Note added." : "Note removed.");
      render();
      return;
    }

    if (state.values[index] === number && state.notes[index] === 0) {
      return;
    }

    saveHistory();
    state.values[index] = number;
    state.notes[index] = 0;
    var peers = peersOf(index);
    for (var peerIndex = 0; peerIndex < peers.length; peerIndex += 1) {
      state.notes[peers[peerIndex]] &= ~bit;
    }

    var isWrong = state.autoCheck && number !== state.solution[index];
    var conflicts = valuesConflict();
    if (isWrong) {
      setMessage("That number does not fit this solution.", "error");
    } else if (conflicts[index]) {
      setMessage("There is a conflict in this row, column, or box.", "error");
    } else {
      setMessage("Nice move.");
    }
    render();
    updateCompletion();
    render();
  }

  function eraseSelected() {
    if (state.isGenerating || state.selectedIndex < 0) {
      return;
    }
    var index = state.selectedIndex;
    if (state.puzzle[index]) {
      setMessage("That clue is fixed. Select an entered square.", "error");
      return;
    }
    if (!state.values[index] && !state.notes[index]) {
      return;
    }

    saveHistory();
    state.values[index] = 0;
    state.notes[index] = 0;
    state.isComplete = false;
    statusDot.classList.remove("is-complete");
    setMessage("Square cleared.");
    render();
  }

  function undo() {
    if (state.isGenerating || state.history.length === 0) {
      return;
    }
    var previous = state.history.pop();
    state.values = previous.values;
    state.notes = previous.notes;
    state.selectedIndex = previous.selectedIndex;
    state.isComplete = false;
    statusDot.classList.remove("is-complete");
    setMessage("Last move undone.");
    render();
  }

  function startNewGame() {
    if (state.isGenerating) {
      return;
    }

    state.isGenerating = true;
    state.isComplete = false;
    state.history = [];
    state.selectedIndex = -1;
    statusDot.classList.remove("is-complete");
    statusDot.classList.add("is-busy");
    setMessage("Making a fresh puzzle…");
    render();

    window.setTimeout(function () {
      try {
        var game = engine.generatePuzzle(state.difficulty);
        state.puzzle = game.puzzle;
        state.solution = game.solution;
        state.values = new Uint8Array(engine.CELL_COUNT);
        state.notes = new Uint16Array(engine.CELL_COUNT);
        puzzleStatus.textContent = engine.DIFFICULTIES[game.difficulty].name + " · " + game.clues + " clues";
        setMessage("Tap a square, then choose a number.");
      } catch (error) {
        setMessage("Could not make a puzzle. Please try again.", "error");
        // Keep the error visible to developers without interrupting the game UI.
        console.error(error);
      } finally {
        state.isGenerating = false;
        statusDot.classList.remove("is-busy");
        render();
      }
    }, 20);
  }

  boardElement.addEventListener("click", function (event) {
    var cell = event.target.closest(".cell");
    if (cell) {
      selectCell(Number(cell.dataset.index));
    }
  });

  numberPad.addEventListener("click", function (event) {
    var button = event.target.closest("[data-number]");
    if (button) {
      enterNumber(Number(button.dataset.number));
    }
  });

  difficultyElement.addEventListener("change", function () {
    state.difficulty = difficultyElement.value;
    var difficulty = engine.DIFFICULTIES[state.difficulty];
    setMessage(difficulty.name + " selected. Tap New game when you are ready.");
  });

  autoCheckElement.addEventListener("change", function () {
    state.autoCheck = autoCheckElement.checked;
    setMessage(state.autoCheck ? "Auto-check is on." : "Auto-check is off. Conflicts are still highlighted.");
    render();
  });

  newGameButton.addEventListener("click", startNewGame);
  undoButton.addEventListener("click", undo);
  eraseButton.addEventListener("click", eraseSelected);
  notesButton.addEventListener("click", function () {
    if (notesButton.disabled) {
      return;
    }
    state.notesMode = !state.notesMode;
    setMessage(state.notesMode ? "Notes are on. Tap numbers to mark candidates." : "Notes are off. Tap a number to fill.");
    render();
  });

  createBoard();
  render();
  startNewGame();
})();
