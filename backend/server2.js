// server2.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

/* =====================================================
   TIMER CONFIGURATION
===================================================== */

const initialTimers = [
  { label: "Leitura 1 - 4min", duration: 4 * 60 },
  { label: "Leitura 2 - 8min", duration: 8 * 60 },
  { label: "Leitura 3 - 15min", duration: 15 * 60 },
  { label: "Leitura 4 - 30min", duration: 30 * 60 },
  { label: "Leitura 5 - 1h", duration: 60 * 60 },
  { label: "Leitura 6 - 2h", duration: 2 * 60 * 60 },
  { label: "Leitura 7 - 4h", duration: 4 * 60 * 60 },
  { label: "Leitura 8 - 8h", duration: 8 * 60 * 60 },
];

const allFoldersConfig = [
  ...Array.from({ length: 8 }, (_, i) => ({
    name: `Prensa ${i + 1}`,
    timersConfig: initialTimers,
  })),
  {
    name: "Adensamento do cisalhamento",
    timersConfig: [{ label: "Leitura única - 30min", duration: 30 * 60 }],
  },
  {
    name: "Cisalhamento",
    timersConfig: [{ label: "Leitura única - 90min", duration: 90 * 60 }],
  },
];

/* =====================================================
   SERVER STATE (SINGLE SOURCE OF TRUTH)
===================================================== */

let foldersState = allFoldersConfig.map((f) => ({
  name: f.name,
  timersConfig: f.timersConfig,
  timers: [],
  isPaused: false,
  elapsed: 0,
  status: "idle", // idle | running | paused
  overallStartTime: null,
}));

/* =====================================================
   MAIN TIMER LOOP
===================================================== */

setInterval(() => {
  const now = Date.now();
  let stateChanged = false;

  foldersState.forEach((folder) => {
    if (folder.status === "running" && !folder.isPaused) {
      folder.elapsed = Math.floor((now - folder.overallStartTime) / 1000);

      folder.timers.forEach((timer) => {
        if (timer.status !== "finished") {
          const timeLeft =
            timer.duration -
            Math.floor((now - timer.startTime) / 1000);

          timer.timeLeft = Math.max(0, timeLeft);

          if (timer.timeLeft === 0) {
            timer.status = "finished";

            const isSpecialTimer =
              folder.name === "Adensamento do cisalhamento" ||
              folder.name === "Cisalhamento";

            io.emit("timer:finished", {
              label: timer.label,
              folderName: folder.name,
              soundType: isSpecialTimer ? "special" : "normal",
            });
          }

          stateChanged = true;
        }
      });
    }
  });

  if (stateChanged) {
    io.emit("state:update", foldersState);
  }
}, 1000);

/* =====================================================
   SOCKET.IO EVENTS
===================================================== */

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send current state immediately
  socket.emit("state:update", foldersState);

  socket.on("folder:start", (index) => {
    const folder = foldersState[index];
    if (folder && folder.status === "idle") {
      folder.status = "running";
      folder.isPaused = false;
      folder.overallStartTime = Date.now();
      folder.elapsed = 0;

      folder.timers = folder.timersConfig.map((t) => ({
        ...t,
        startTime: Date.now(),
        timeLeft: t.duration,
        status: "running",
      }));

      io.emit("state:update", foldersState);
    }
  });

  socket.on("folder:pause", (index) => {
    const folder = foldersState[index];
    if (folder && folder.status === "running") {
      folder.isPaused = !folder.isPaused;
      io.emit("state:update", foldersState);
    }
  });

  socket.on("folder:reset", (index) => {
    const folder = foldersState[index];
    if (folder) {
      folder.status = "idle";
      folder.isPaused = false;
      folder.elapsed = 0;
      folder.overallStartTime = null;
      folder.timers = [];
      io.emit("state:update", foldersState);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

/* =====================================================
   SERVER START
===================================================== */

const PORT = 4000;

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
