(function () {
  "use strict";

  var engine = window.SudokuEngine;
  if (!engine) {
    throw new Error("SudokuEngine is not available.");
  }

  var boardElement = document.getElementById("board");
  var difficultyElement = document.getElementById("difficulty");
  var newGameButton = document.getElementById("new-game");
  var printButton = document.getElementById("print-puzzle");
  var seedInput = document.getElementById("seed");
  var loadSeedButton = document.getElementById("load-seed");
  var puzzleLink = document.getElementById("puzzle-link");
  var copyLinkButton = document.getElementById("copy-link");
  var seedStatus = document.getElementById("seed-status");
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
  var completionList = document.getElementById("completion-list");
  var completionHelp = document.getElementById("completion-help");
  var COMPLETION_STORAGE_KEY = "betterpelicans.sudoku.completions.v1";
  var completions = [];
  var historySaved = true;

  function readCompletions() {
    var stored;
    try {
      stored = window.localStorage.getItem(COMPLETION_STORAGE_KEY);
    } catch (error) {
      // Storage can be disabled or unavailable. The game remains playable.
      return null;
    }
    try {
      var entries = JSON.parse(stored || "[]");
      if (!Array.isArray(entries)) {
        return [];
      }
      return entries.filter(function (entry) {
        return entry && Object.prototype.hasOwnProperty.call(engine.DIFFICULTIES, entry.difficulty) &&
          Number.isInteger(entry.seed) && entry.seed >= 1 && entry.seed <= 4294967295 &&
          typeof entry.version === "string" && (entry.version === "1" || entry.version === "2") &&
          Number.isInteger(entry.clues) && entry.clues >= 17 && entry.clues <= 81 &&
          typeof entry.completedAt === "string" && Number.isFinite(Date.parse(entry.completedAt));
      }).slice(0, 100);
    } catch (error) {
      return [];
    }
  }

  function renderCompletions() {
    completionList.textContent = "";
    completionHelp.textContent = historySaved ?
      "Latest 100 completions, saved in this browser on this device. History starts with new completions." :
      "History cannot be saved in this browser right now. New completions are kept for this session only.";
    if (!completions.length) {
      var empty = document.createElement("li");
      empty.className = "completion-empty";
      empty.textContent = "No completed puzzles yet. Finish a puzzle to add it here.";
      completionList.appendChild(empty);
      return;
    }
    completions.forEach(function (entry, index) {
      var item = document.createElement("li");
      var details = document.createElement("div");
      var title = document.createElement("p");
      var reference = document.createElement("p");
      var date = document.createElement("time");
      var replay = document.createElement("button");
      title.className = "completion-title";
      title.textContent = engine.DIFFICULTIES[entry.difficulty].name + " · " + entry.clues + " clues";
      reference.textContent = "Seed " + entry.seed + " · v" + entry.version;
      date.dateTime = entry.completedAt;
      date.textContent = new Date(entry.completedAt).toLocaleString();
      details.appendChild(title);
      details.appendChild(reference);
      details.appendChild(date);
      replay.type = "button";
      replay.className = "secondary-button";
      replay.textContent = "Replay";
      replay.dataset.completionIndex = String(index);
      replay.setAttribute("aria-label", "Replay " + engine.DIFFICULTIES[entry.difficulty].name + " puzzle, seed " + entry.seed);
      replay.disabled = state.isGenerating;
      item.appendChild(details);
      item.appendChild(replay);
      completionList.appendChild(item);
    });
  }

  function recordCompletion() {
    if (state.completionRecorded) {
      return;
    }
    state.completionRecorded = true;
    var existing = readCompletions();
    if (historySaved && existing !== null) {
      completions = existing;
    }
    completions.unshift({
      difficulty: state.game.difficulty,
      seed: state.game.seed,
      version: state.game.version,
      clues: state.game.clues,
      completedAt: new Date().toISOString()
    });
    completions = completions.slice(0, 100);
    try {
      window.localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(completions));
      historySaved = true;
    } catch (error) {
      historySaved = false;
    }
    renderCompletions();
  }

  var state = {
    difficulty: difficultyElement.value,
    puzzle: null,
    solution: null,
    seed: null,
    game: null,
    completionRecorded: false,
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
    printButton.disabled = state.isGenerating || !state.puzzle;
    seedInput.disabled = state.isGenerating;
    loadSeedButton.disabled = state.isGenerating;
    copyLinkButton.disabled = state.isGenerating || !state.puzzle;
    completionList.querySelectorAll("button").forEach(function (button) {
      button.disabled = state.isGenerating;
    });
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
    if (state.isGenerating || !state.puzzle) {
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
    recordCompletion();
    statusDot.classList.add("is-complete");
    setMessage(historySaved ? "Puzzle complete — nicely done." : "Puzzle complete — nicely done. History kept for this session only.", "success");
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

  function startNewGame(seed, version) {
    if (state.isGenerating) {
      return;
    }

    var requestedSeed;
    try {
      requestedSeed = seed === undefined ? Math.floor(Math.random() * 4294967295) + 1 : engine.parseSeed(seed);
      if (seed === undefined && requestedSeed === state.seed) {
        requestedSeed = requestedSeed % 4294967295 + 1;
      }
      if (version && version !== engine.generatorVersion(state.difficulty)) {
        throw new Error("This puzzle uses an unsupported generator version.");
      }
    } catch (error) {
      setMessage(error.message, "error");
      return;
    }
    var requestedDifficulty = state.difficulty;
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
        var game = engine.generateSeededPuzzle(requestedDifficulty, requestedSeed, version);
        state.puzzle = game.puzzle;
        state.solution = game.solution;
        state.seed = game.seed;
        state.game = { difficulty: game.difficulty, seed: game.seed, version: game.version, clues: game.clues };
        state.completionRecorded = false;
        state.values = new Uint8Array(engine.CELL_COUNT);
        state.notes = new Uint16Array(engine.CELL_COUNT);
        puzzleStatus.textContent = engine.DIFFICULTIES[game.difficulty].name + " · " + game.clues + " clues";
        seedInput.value = String(game.seed);
        seedStatus.textContent = "Seed " + game.seed + " · v" + game.version;
        var url = new URL(window.location.href);
        url.search = "";
        url.hash = "";
        url.searchParams.set("seed", String(game.seed));
        url.searchParams.set("difficulty", game.difficulty);
        url.searchParams.set("v", game.version);
        puzzleLink.value = url.href;
        window.history.replaceState(null, "", url.href);
        setMessage("Tap a square, then choose a number.");
      } catch (error) {
        setMessage(requestedDifficulty === "extreme" ? error.message : "Could not make a puzzle. Please try again.", "error");
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

  newGameButton.addEventListener("click", function () { startNewGame(); });
  completionList.addEventListener("click", function (event) {
    var button = event.target.closest("[data-completion-index]");
    if (!button || state.isGenerating) {
      return;
    }
    var entry = completions[Number(button.dataset.completionIndex)];
    if (!entry) {
      return;
    }
    state.difficulty = entry.difficulty;
    difficultyElement.value = entry.difficulty;
    startNewGame(entry.seed, entry.version);
    boardElement.scrollIntoView({ block: "start" });
  });
  window.addEventListener("storage", function (event) {
    if (event.key === COMPLETION_STORAGE_KEY || event.key === null) {
      var entries = readCompletions();
      if (entries !== null && historySaved) {
        completions = entries;
        renderCompletions();
      }
    }
  });
  document.getElementById("seed-form").addEventListener("submit", function (event) {
    event.preventDefault();
    startNewGame(seedInput.value);
  });
  copyLinkButton.addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(puzzleLink.value);
      setMessage("Puzzle link copied. It recreates the original puzzle.");
    } catch (error) {
      puzzleLink.focus();
      puzzleLink.select();
      setMessage("Select and copy the puzzle link above.");
    }
  });
  printButton.addEventListener("click", function () {
    if (!printButton.disabled) {
      window.print();
    }
  });
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
  var savedCompletions = readCompletions();
  historySaved = savedCompletions !== null;
  completions = savedCompletions || [];
  renderCompletions();
  render();
  var params = new URLSearchParams(window.location.search);
  if (params.has("seed")) {
    var difficulty = params.get("difficulty");
    if (Object.prototype.hasOwnProperty.call(engine.DIFFICULTIES, difficulty)) {
      difficultyElement.value = difficulty;
      state.difficulty = difficulty;
      seedInput.value = params.get("seed");
      startNewGame(params.get("seed"), params.get("v") || engine.generatorVersion(difficulty));
    } else {
      setMessage("This puzzle link needs a valid difficulty. Choose one and load the seed.", "error");
      seedInput.value = params.get("seed");
    }
  } else {
    startNewGame();
  }
})();
