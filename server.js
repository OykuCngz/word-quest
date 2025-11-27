const fs = require("fs");
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const WORDS = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "public", "data", "words-a1-a2.json"),
    "utf8"
  )
);

const MAX_QUESTIONS = 10;
const MAX_LIVES = 3;

const rooms = {};

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms[code]);
  return code;
}

function buildMask(word) {
  const chars = word.toUpperCase().split("");
  const indices = chars
    .map((ch, i) => ({ ch, i }))
    .filter((x) => /[A-Z]/.test(x.ch))
    .map((x) => x.i);

  const revealCount = Math.max(1, Math.floor(indices.length / 2));
  const shuffled = [...indices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const revealIndices = shuffled.slice(0, revealCount);
  const revealSet = new Set(revealIndices);

  const maskedWord = chars
    .map((ch, i) => {
      if (!/[A-Z]/.test(ch)) return ch;
      return revealSet.has(i) ? ch : "_";
    })
    .join(" ");

  return { maskedWord, revealIndices };
}

function buildMaskedWord(word, guessedLetters, revealIndices = []) {
  const chars = word.toUpperCase().split("");
  const revealSet = new Set(revealIndices);

  return chars
    .map((ch, i) => {
      if (!/[A-Z]/.test(ch)) return ch;

      const lower = ch.toLowerCase();
      if (revealSet.has(i)) return ch;
      if (guessedLetters.includes(lower)) return ch;

      return "_";
    })
    .join(" ");
}

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  socket.on("host-create-room", (cb) => {
    const code = generateRoomCode();
    rooms[code] = {
      hostId: socket.id,
      players: {}, 
      currentQuestionIndex: -1,
      usedWords: [...WORDS].sort(() => Math.random() - 0.5).slice(0, MAX_QUESTIONS),
      questionStartTime: null, 
      revealIndices: [],
    };
    socket.join(code);
    console.log("Oda oluşturuldu:", code);
    cb({ roomCode: code });
  });

  socket.on("player-join", ({ roomCode, name }, cb) => {
    const room = rooms[roomCode];
    if (!room) {
      cb({ ok: false, error: "Room not found" });
      return;
    }

    room.players[socket.id] = {
      name,
      score: 0,
      lives: MAX_LIVES,
      answeredCurrent: false,
      guessedLetters: [],
    };

    socket.join(roomCode);
    cb({ ok: true });

    io.to(room.hostId).emit("room-players", {
      players: Object.values(room.players),
    });
  });

  socket.on("host-next-question", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.currentQuestionIndex++;

    if (room.currentQuestionIndex >= room.usedWords.length) {
      const scoreBoard = Object.values(room.players).sort(
        (a, b) => b.score - a.score
      );
      io.to(roomCode).emit("game-finished", { scoreBoard });
      return;
    }

    const entry = room.usedWords[room.currentQuestionIndex];
    const { maskedWord, revealIndices } = buildMask(entry.word);
    room.revealIndices = revealIndices;
    room.questionStartTime = Date.now(); 

    Object.values(room.players).forEach((p) => {
      p.answeredCurrent = false;
      p.guessedLetters = [];
    });

    io.to(roomCode).emit("new-question", {
      index: room.currentQuestionIndex + 1,
      total: room.usedWords.length,
      maskedWord,
      hint: entry.hint,
    });

    const scoreBoard = Object.values(room.players).sort(
      (a, b) => b.score - a.score
    );
    io.to(room.hostId).emit("scoreboard-update", { scoreBoard });
  });

socket.on("player-answer", ({ roomCode, answer }, cb) => {
  const room = rooms[roomCode];
  if (!room) {
    cb && cb({ ok: false, error: "Room not found" });
    return;
  }

  const player = room.players[socket.id];
  if (!player) {
    cb && cb({ ok: false, error: "Player not in room" });
    return;
  }

  if (player.lives <= 0) {
    cb &&
      cb({
        ok: false,
        error: "You have no lives left. Please wait for the next game.",
      });
    return;
  }

  const entry = room.usedWords[room.currentQuestionIndex];
  if (!entry) {
    cb && cb({ ok: false, error: "No active question" });
    return;
  }

  const cleaned = answer.trim().toLowerCase();
  const target = entry.word.toLowerCase();

  if (!cleaned) {
    cb && cb({ ok: false, error: "Type something" });
    return;
  }

  if (cleaned.length === 1) {
    if (!/[a-z]/.test(cleaned)) {
      cb && cb({ ok: false, error: "Not a letter" });
      return;
    }

    if (player.guessedLetters.includes(cleaned)) {
      cb &&
        cb({
          ok: false,
          error: `You already tried "${cleaned.toUpperCase()}".`,
        });
      return;
    }

    let correct = false;

    if (target.includes(cleaned)) {
      correct = true;
      player.guessedLetters.push(cleaned);
     
      player.score += 1;
    } else {
    
      player.lives = Math.max(0, player.lives - 1);
    }

    const maskedWord = buildMaskedWord(
      entry.word,
      player.guessedLetters,
      room.revealIndices || []
    );

    cb &&
      cb({
        ok: true,
        type: "letter",
        correct,
        message: correct
          ? `Correct! "${cleaned.toUpperCase()}" is in the word.`
          : `Sorry, "${cleaned.toUpperCase()}" is not in the word.`,
        lives: player.lives,
        score: player.score,
        maskedWord,
        gameOverForPlayer: player.lives <= 0,
      });
  } else {

    if (player.answeredCurrent) {
      cb && cb({ ok: false, error: "You already tried this word." });
      return;
    }

    const fullMask = entry.word.toUpperCase().split("").join(" ");

    if (cleaned === target) {
      const basePoints = 10;
      let bonus = 0;

      if (room.questionStartTime) {
        const elapsedSec = (Date.now() - room.questionStartTime) / 1000;
        const SPEED_WINDOW = 20; // 20 sn içinde -> yüksek bonus
        const remaining = Math.max(0, SPEED_WINDOW - elapsedSec);
        bonus = Math.floor(remaining); // 0..20
      }

      const gained = basePoints + bonus;
      player.score += gained;
      player.answeredCurrent = true;

      cb &&
        cb({
          ok: true,
          type: "word",
          correct: true,
          message:
            bonus > 0
              ? `✅ Correct! The word was "${entry.word.toUpperCase()}". +${basePoints} points, +${bonus} speed bonus 🚀`
              : `✅ Correct! The word was "${entry.word.toUpperCase()}". +${basePoints} points.`,
          score: player.score,
          lives: player.lives,
          maskedWord: fullMask,
          correctWord: entry.word,
          showCorrect: true,
        });
    } else {
      player.lives = Math.max(0, player.lives - 1);
      player.answeredCurrent = true; 

      cb &&
        cb({
          ok: true,
          type: "word",
          correct: false,
          message: `❌ Not correct. The correct word was "${entry.word.toUpperCase()}".`,
          lives: player.lives,
          score: player.score,
          maskedWord: fullMask,   
          correctWord: entry.word,
          showCorrect: true,
          gameOverForPlayer: player.lives <= 0,
        });
    }
  }

  const scoreBoard = Object.values(room.players).sort(
    (a, b) => b.score - a.score
  );
  io.to(room.hostId).emit("scoreboard-update", { scoreBoard });
});


  socket.on("disconnect", () => {
    console.log("Bağlantı koptu:", socket.id);

    for (const [code, room] of Object.entries(rooms)) {
      if (room.hostId === socket.id) {
        delete rooms[code];
        io.to(code).emit("room-closed");
      } else if (room.players[socket.id]) {
        delete room.players[socket.id];
        const scoreBoard = Object.values(room.players).sort(
          (a, b) => b.score - a.score
        );
        io.to(room.hostId).emit("scoreboard-update", { scoreBoard });
      }
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
