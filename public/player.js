const socket = io();

const welcomeScreen = document.getElementById("welcome-screen");
const joinScreen = document.getElementById("join-screen");
const gameScreen = document.getElementById("game-screen");
const resultsScreen = document.getElementById("results-page");

const goJoinBtn = document.getElementById("go-join");

const joinForm = document.getElementById("join-form");
const joinBtn = document.getElementById("join-btn");
const joinStatus = document.getElementById("join-status");
const roomCodeInput = document.getElementById("room-code-input");
const playerNameInput = document.getElementById("player-name-input");

const questionNumberEl = document.getElementById("player-question-number");
const maskedWordEl = document.getElementById("player-masked-word");
const hintEl = document.getElementById("player-hint");
const livesHeartsEl = document.getElementById("player-lives-hearts");
const scoreEl = document.getElementById("player-score");
const usedLettersEl = document.getElementById("used-letters");
const answerInput = document.getElementById("answer-input");
const answerBtn = document.getElementById("answer-btn");
const answerStatusEl = document.getElementById("answer-status");

const finalScoreEl = document.getElementById("final-score");
const finalScoreBigEl = document.getElementById("final-score-big");
const finalRankEl = document.getElementById("final-rank");
const resultsListEl = document.getElementById("results-list");
const wordsProgressFill = document.getElementById("words-progress-fill");
const wordsCorrectText = document.getElementById("words-correct-text");
const resultsTitleEl = document.getElementById("results-title");
const playAgainBtn = document.getElementById("play-again-btn");


let currentRoomCode = null;
let playerName = "";
let playerLives = 3;
let playerScore = 0;

let guessedLetters = [];
let missedLetters = [];
let isOutOfLives = false;


function showScreen(screen) {
  [welcomeScreen, joinScreen, gameScreen, resultsScreen].forEach((s) =>
    s.classList.remove("screen--active")
  );
  screen.classList.add("screen--active");
}

function renderLives(lives) {
  livesHeartsEl.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement("span");
    heart.classList.add("heart-icon");
    if (i < lives) heart.classList.add("full");
    else heart.classList.add("empty");
    livesHeartsEl.appendChild(heart);
  }
}

function setFeedback(msg, type) {
  answerStatusEl.textContent = msg || "";
  answerStatusEl.className = "feedback-pill";
  if (type === "success") answerStatusEl.classList.add("success");
  if (type === "error") answerStatusEl.classList.add("error");
}

function renderUsedLetters() {
  usedLettersEl.innerHTML = "";
  guessedLetters.forEach((ltr) => {
    const chip = document.createElement("div");
    chip.className = "used-letter-chip";
    chip.textContent = ltr.toUpperCase();
    usedLettersEl.appendChild(chip);
  });

  missedLetters.forEach((ltr) => {
    const chip = document.createElement("div");
    chip.className = "used-letter-chip miss";
    chip.textContent = ltr.toUpperCase();
    usedLettersEl.appendChild(chip);
  });
}


goJoinBtn.addEventListener("click", () => {
  showScreen(joinScreen);
});


joinForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const roomCode = roomCodeInput.value.trim();
  const name = playerNameInput.value.trim();

  if (!roomCode || !name) {
    joinStatus.textContent = "Please enter room code and name.";
    joinStatus.className = "feedback-pill error";
    return;
  }

  socket.emit("player-join", { roomCode, name }, (res) => {
    if (!res.ok) {
      joinStatus.textContent = res.error;
      joinStatus.className = "feedback-pill error";
      return;
    }

    playerName = name;
    currentRoomCode = roomCode;

    guessedLetters = [];
    missedLetters = [];
    playerLives = 3;
    playerScore = 0;
    isOutOfLives = false;

    renderLives(playerLives);
    renderUsedLetters();
    scoreEl.textContent = "0";
    setFeedback("", null);

    const overlay = document.getElementById("out-overlay");
    const popup = document.getElementById("out-popup");
    if (overlay) overlay.style.display = "none";
    if (popup) {
      popup.style.display = "block";
      popup.classList.remove("fade-out");
    }

    showScreen(gameScreen);
    answerInput.focus();
  });
});


socket.on("new-question", ({ index, total, maskedWord, hint }) => {
  questionNumberEl.textContent = `${index} / ${total}`;
  maskedWordEl.textContent = maskedWord;
  hintEl.textContent = hint;

  guessedLetters = [];
  missedLetters = [];
  renderUsedLetters();

  const overlay = document.getElementById("out-overlay");
  const popup = document.getElementById("out-popup");

  if (playerLives <= 0) {
    isOutOfLives = true;
    if (overlay) overlay.style.display = "flex";
    if (popup) {
     
      popup.style.display = "none";
    }
    answerInput.disabled = true;
    answerBtn.disabled = true;
    setFeedback("No lives left. Please wait for the next game. 💔", "error");
  } else {
    
    isOutOfLives = false;
    if (overlay) overlay.style.display = "none";
    if (popup) {
      popup.style.display = "block";
      popup.classList.remove("fade-out");
    }
    answerInput.disabled = false;
    answerBtn.disabled = false;
    setFeedback("", null);
  }

  answerInput.value = "";
});


answerBtn.addEventListener("click", sendAnswer);
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendAnswer();
});

function sendAnswer() {
  const answer = answerInput.value.trim();
  if (!answer || !currentRoomCode) return;

  socket.emit(
    "player-answer",
    { roomCode: currentRoomCode, answer },
    (res) => {
      if (!res) return;

      if (!res.ok) {
        setFeedback(res.error, "error");
        return;
      }


      if (typeof res.lives === "number") {
        playerLives = res.lives;
        renderLives(playerLives);
      }

      if (typeof res.score === "number") {
        playerScore = res.score;
        scoreEl.textContent = playerScore;
      }

      if (res.maskedWord) {
        maskedWordEl.textContent = res.maskedWord;
      }

   
      if (res.gameOverForPlayer || playerLives <= 0) {
        isOutOfLives = true;

        const overlay = document.getElementById("out-overlay");
        const popup = document.getElementById("out-popup");

        answerInput.disabled = true;
        answerBtn.disabled = true;
        setFeedback(
          "No lives left. Please wait for the next game. 💔",
          "error"
        );

        if (overlay) overlay.style.display = "flex";
        if (popup) {
         
          popup.style.display = "block";
          popup.classList.remove("fade-out");

         
          setTimeout(() => {
            popup.classList.add("fade-out");
           
            setTimeout(() => {
              popup.style.display = "none";
            }, 1000);
          }, 3000);
        }

        return;
      }

      if (res.type === "letter") {
        const letter = answer.toLowerCase();

        if (res.correct) {
          if (!guessedLetters.includes(letter)) {
            guessedLetters.push(letter);
          }
          setFeedback(res.message, "success");
        } else {
          if (!missedLetters.includes(letter)) {
            missedLetters.push(letter);
          }
          setFeedback(res.message, "error");
        }

        renderUsedLetters();
      }


      if (res.type === "word") {
        if (res.correct) {
          setFeedback(res.message, "success");
        } else {
          setFeedback(res.message, "error");
        }

        if (res.showCorrect) {
          answerInput.disabled = true;
          answerBtn.disabled = true;
        }
      }
    }
  );

  answerInput.value = "";
  answerInput.focus();
}



socket.on("game-finished", ({ scoreBoard }) => {
  showScreen(resultsScreen);


  const overlay = document.getElementById("out-overlay");
  const popup = document.getElementById("out-popup");
  if (overlay) overlay.style.display = "none";
  if (popup) {
    popup.style.display = "block";
    popup.classList.remove("fade-out");
  }

  resultsListEl.innerHTML = "";

  let myRank = null;
  let myScore = 0;

  scoreBoard.forEach((p, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${p.name} – ${p.score}`;
    resultsListEl.appendChild(li);

    if (p.name === playerName) {
      myRank = idx + 1;
      myScore = p.score;
    }
  });

  finalScoreEl.textContent = myScore;
  finalScoreBigEl.textContent = myScore;

  const correctCount = Math.min(10, Math.round(myScore / 10));
  wordsCorrectText.textContent = `${correctCount}/10`;
  wordsProgressFill.style.width = `${(correctCount / 10) * 100}%`;

  if (myRank === 1) resultsTitleEl.textContent = "Great Effort! 🏆";
  else if (myRank <= 3) resultsTitleEl.textContent = "Nice! Top 3 🎉";
  else resultsTitleEl.textContent = "Well done! Keep practicing 💚";

  finalRankEl.textContent = `Rank: #${myRank}`;
});

playAgainBtn.addEventListener("click", () => {
  window.location.reload();
});
