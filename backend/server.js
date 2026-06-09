// server.js
const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});


// --- Constants for server-side initialization ---
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
    name: "Adensamento - CD",
    timersConfig: [{ label: "Leitura única - 30min", duration: 30 * 60 }],
  },
  {
    name: "Ruptura - CD",
    timersConfig: [{ label: "Leitura única - 80min", duration: 80 * 60 }],
  },
  {
    name: "Adensamento - Triaxial CU",
    timersConfig: [{ label: "Leitura única - 1h", duration: 60 * 60 }],
  },
  {
    name: "Ruptura - Triaxial CU",
    timersConfig: [{ label: "Leitura única - 2h", duration: 120 * 60 }],
  },
  {
    name: "Ruptura - Triaxial UU",
    timersConfig: [
      { label: "Estabilização - 10min", duration: 10 * 60 },
      { label: "Ruptura - 50min", duration: 60 * 60 }
    ],
  },
];

// --- Server state ---
let foldersState = allFoldersConfig.map(f => ({
  name: f.name,
  timersConfig: f.timersConfig,
  timers: [],
  isPaused: false,
  elapsed: 0,
  status: "idle",
  overallStartTime: null,
}));

// --- Sound mapping ---
const soundMap = {
  "Adensamento - CD": "special",
  "Ruptura - CD": "special",
  "Adensamento - Triaxial CU": "triaxial",
  "Ruptura - Triaxial CU": "triaxial",
  "Ruptura - Triaxial UU": "triaxial"
};

// --- Main loop ---
setInterval(() => {
  const now = Date.now();
  let stateChanged = false;

  foldersState.forEach(folder => {
    if (folder.status === "running" && !folder.isPaused) {

      folder.elapsed = Math.floor((now - folder.overallStartTime) / 1000);

      folder.timers.forEach(timer => {

        if (timer.status !== "finished") {

          const timeLeft = timer.duration - Math.floor((now - timer.startTime) / 1000);
          timer.timeLeft = Math.max(0, timeLeft);

          if (timer.timeLeft === 0) {

            timer.status = "finished";

            const soundType = soundMap[folder.name] || "normal";

            io.emit("timer:finished", {
              label: timer.label,
              folderName: folder.name,
              soundType: soundType
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


// --- Socket events ---
io.on("connection", (socket) => {

  console.log("Client connected:", socket.id);

  socket.emit("state:update", foldersState);

  socket.on("folder:start", (index) => {

    const folder = foldersState[index];

    if (folder && folder.status === "idle") {

      folder.status = "running";
      folder.isPaused = false;
      folder.overallStartTime = Date.now();

      folder.timers = folder.timersConfig.map(t => ({
        ...t,
        startTime: Date.now(),
        timeLeft: t.duration,
        status: "running"
      }));
    }

    io.emit("state:update", foldersState);
  });

  socket.on("folder:reset", (index) => {

    const folder = foldersState[index];

    if (folder) {
      folder.status = "idle";
      folder.isPaused = false;
      folder.timers = [];
      folder.elapsed = 0;
      folder.overallStartTime = null;
    }

    io.emit("state:update", foldersState);
  });

  socket.on("folder:pause", (index) => {

    const folder = foldersState[index];

    if (folder && folder.status === "running") {
      folder.isPaused = !folder.isPaused;
    }

    io.emit("state:update", foldersState);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

});

const PORT = 4000;


// ESCUTA EM 0.0.0.0 PARA ACEITAR CONEXÕES DE QUALQUER MÁQUINA DA REDE LOCAL

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});


