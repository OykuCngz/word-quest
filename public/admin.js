const socket = io();

const createRoomBtn = document.getElementById("create-room-btn");
const nextQuestionBtn = document.getElementById("next-question-btn");

const roomCodePill = document.getElementById("room-code-pill");
const roomCodeDisplay = document.getElementById("room-code-display");

const hostQuestionInfo = document.getElementById("host-question-info");
const hostMaskedWord = document.getElementById("host-masked-word");
const hostHint = document.getElementById("host-hint");

const timerSecondsEl = document.getElementById("timer-seconds");
const timerBarFill = document.getElementById("timer-bar-fill");

const scoreboardHint = document.getElementById("scoreboard-hint");
const scoreboardList = document.getElementById("scoreboard-list");



let currentRoomCode = null;


const QUESTION_TIME = 20; 
let timerInterval = null;
let remainingSeconds = QUESTION_TIME;


function resetTimer() {
  clearInterval(timerInterval);
  remainingSeconds = QUESTION_TIME;
  timerSecondsEl.textContent = "-- s";
  timerBarFill.style.width = "0%";
}

function startTimer() {
  clearInterval(timerInterval);
  remainingSeconds = QUESTION_TIME;
  timerSecondsEl.textContent = `${remainingSeconds}s`;
  timerBarFill.style.width = "100%";

  timerInterval = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearInterval(timerInterval);
    }
    timerSecondsEl.textContent = `${remainingSeconds}s`;
    const ratio = remainingSeconds / QUESTION_TIME;
    timerBarFill.style.width = `${ratio * 100}%`;
  }, 1000);
}


function renderScoreboard(
  scoreBoard,
  { emptyText = "Waiting for players to join..." } = {}
) {
  scoreboardList.innerHTML = "";

  if (!scoreBoard || scoreBoard.length === 0) {
    scoreboardHint.textContent = emptyText;
    return;
  }

 
  scoreBoard = [...scoreBoard].sort((a, b) => b.score - a.score);
  scoreboardHint.textContent = "";

  scoreBoard.forEach((p) => {
    const li = document.createElement("li");
    li.className = "scoreboard-item";

    const main = document.createElement("div");
    main.className = "scoreboard-main";

    const nameEl = document.createElement("span");
    nameEl.className = "scoreboard-name";
    nameEl.textContent = p.name;

    const statusEl = document.createElement("span");
    statusEl.className = "scoreboard-status";

    if (p.lives <= 0) {
      statusEl.textContent = "Out of lives 💔";
    } else {
      statusEl.textContent = `${p.lives} hearts left`;
    }

    main.appendChild(nameEl);
    main.appendChild(statusEl);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.flexDirection = "column";
    right.style.alignItems = "flex-end";
    right.style.gap = "2px";

    const scoreEl = document.createElement("span");
    scoreEl.className = "scoreboard-score";
    scoreEl.textContent = p.score;

    const livesEl = document.createElement("span");
    livesEl.className = "scoreboard-lives";

    for (let i = 0; i < 3; i++) {
      const heart = document.createElement("span");
      heart.classList.add("heart-icon");
      if (i < p.lives) heart.classList.add("full");
      else heart.classList.add("empty");
      livesEl.appendChild(heart);
    }

    right.appendChild(scoreEl);
    right.appendChild(livesEl);

    li.appendChild(main);
    li.appendChild(right);
    scoreboardList.appendChild(li);
  });
}

createRoomBtn.addEventListener("click", () => {
  socket.emit("host-create-room", ({ roomCode }) => {
    currentRoomCode = roomCode;

    roomCodeDisplay.textContent = roomCode;
    roomCodePill.classList.remove("room-code-pill--hidden");

    hostQuestionInfo.textContent =
      "Room created. Share the code with your students.";
    hostHint.textContent =
      'Press "Start / Next Question" when everyone is ready.';
    hostMaskedWord.textContent = "_ _ _";
    nextQuestionBtn.disabled = false;
    nextQuestionBtn.textContent = "Start / Next Question";
    resetTimer();
    renderScoreboard([], {});
  });
});



nextQuestionBtn.addEventListener("click", () => {
  if (!currentRoomCode) return;
  socket.emit("host-next-question", { roomCode: currentRoomCode });
});


socket.on("new-question", ({ index, total, maskedWord, hint }) => {
  hostQuestionInfo.textContent = `Question ${index} / ${total}`;
  hostMaskedWord.textContent = maskedWord;
  hostHint.textContent = hint || "";

  startTimer();


  nextQuestionBtn.disabled = false;
  if (index === total) {
    nextQuestionBtn.textContent = "Finish Game";
    nextQuestionBtn.classList.add("finish-btn"); 
  } else {
    nextQuestionBtn.textContent = "Next Question";
    nextQuestionBtn.classList.remove("finish-btn");
  }
});

socket.on("scoreboard-update", ({ scoreBoard }) => {
  renderScoreboard(scoreBoard, { emptyText: "Waiting for players to join..." });
});


socket.on("game-finished", ({ scoreBoard }) => {
  resetTimer();

  hostQuestionInfo.textContent = "Game Over 🎉";
  hostMaskedWord.textContent = "_ _ _";
  hostHint.textContent =
    "All questions are finished. These are the final scores.";

  nextQuestionBtn.disabled = true;
  nextQuestionBtn.textContent = "Game Finished";
  nextQuestionBtn.classList.remove("finish-btn");

  renderScoreboard(scoreBoard, { emptyText: "No players in this room." });
});


socket.on("room-closed", () => {
  resetTimer();
  hostQuestionInfo.textContent = "Room closed.";
  hostHint.textContent = "Create a new room to start again.";
  hostMaskedWord.textContent = "_ _ _";
  renderScoreboard([], { emptyText: "Waiting for players to join..." });
  nextQuestionBtn.disabled = true;
  nextQuestionBtn.textContent = "Start / Next Question";
  nextQuestionBtn.classList.remove("finish-btn");
});
