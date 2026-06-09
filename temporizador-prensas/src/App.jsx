import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

//  RESOLVE O HOST DINAMICAMENTE A PARTIR DA URL DE ACESSO, DISPENSANDO IP FIXO

const socket = io(`http://${window.location.hostname}:4000`);



function Timer({ label, timeLeft }) {

  const formatTime = (seconds) => {

    if (isNaN(seconds) || seconds < 0) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2,'0')}:${remainingSeconds
      .toString()
      .padStart(2,'0')}`;
  };

  return (
    <div className="border rounded-xl p-2 m-1 w-full bg-white shadow text-center">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{label}</h3>
      <p className="text-xl font-mono text-gray-900">
        {formatTime(timeLeft)}
      </p>
    </div>
  );
}


function Folder({
  name,
  timers,
  onStart,
  onReset,
  onPause,
  isPaused,
  elapsed,
  status
}) {

  const formatElapsed = (seconds) => {

    if (isNaN(seconds) || seconds < 0) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2,'0')}:${remainingSeconds
      .toString()
      .padStart(2,'0')}`;
  };

  return (
    <div className="p-3 bg-gray-50 border rounded-2xl w-[220px] h-[90vh] overflow-y-auto shadow mx-1">

      <div className="flex flex-col gap-1 mb-2">

        <div className="flex justify-between items-center">
          <h2 className="text-md font-bold text-gray-900">{name}</h2>

          {status !== "idle" && (
            <span className="text-xs font-mono text-gray-600">
              {formatElapsed(elapsed)}
            </span>
          )}
        </div>

        <div className="flex gap-1">

          <button
            onClick={onStart}
            disabled={status !== "idle"}
            className="bg-blue-600 text-white px-2 py-1 rounded text-xs disabled:bg-gray-400"
          >
            Iniciar
          </button>

          <button
            onClick={onReset}
            className="bg-red-600 text-white px-2 py-1 rounded text-xs"
          >
            Reiniciar
          </button>

          <button
            onClick={onPause}
            disabled={status === "idle"}
            className="bg-yellow-600 text-white px-2 py-1 rounded text-xs disabled:bg-gray-400"
          >
            {isPaused ? "Retomar" : "Pausar"}
          </button>

        </div>
      </div>

      <div className="flex flex-col gap-2">
        {timers.map((t, idx) => (
          <Timer key={idx} label={t.label} timeLeft={t.timeLeft} />
        ))}
      </div>

    </div>
  );
}


export default function App() {

  const [folders, setFolders] = useState([]);
  const [notifications, setNotifications] = useState([]);


  // SOUND SYSTEM
  const playSound = (soundType = "normal") => {

    const sounds = {

      normal:
        "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",

      special:
        "https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg",

      triaxial:
        "https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg"
    };

    const audio = new Audio(sounds[soundType] || sounds.normal);

    audio.play().catch(e =>
      console.warn("Could not play sound:", e)
    );
  };


  useEffect(() => {

    socket.on("state:update", (serverState) => {

      if (Array.isArray(serverState)) {
        setFolders(serverState);
      }
    });

    socket.on("timer:finished", ({ label, folderName, soundType }) => {

      playSound(soundType);

      const id = Date.now();

      const message =
        `Tempo concluído: ${label} (Pasta: ${folderName})`;

      setNotifications(prev => [...prev, { id, message }]);
    });

    return () => {

      socket.off("state:update");
      socket.off("timer:finished");

    };

  }, []);


  const handleStart = (index) => {

    if (folders[index]?.name === "Ruptura - CD") {

      const confirmed =
        window.confirm("OS PARAFUSOS DE CISALHAMENTO FORAM RETIRADOS?");

      if (!confirmed) return;
    }

    socket.emit("folder:start", index);
  };


  const handleReset = (index) => {
    socket.emit("folder:reset", index);
  };


  const handlePause = (index) => {
    socket.emit("folder:pause", index);
  };


  return (

    <div className="p-4 overflow-x-auto whitespace-nowrap h-screen w-screen bg-gray-100">

      <div className="inline-flex">

        {folders.map((folder, index) => (

          <Folder
            key={index}
            name={folder.name}
            timers={folder.timers}
            onStart={() => handleStart(index)}
            onReset={() => handleReset(index)}
            onPause={() => handlePause(index)}
            isPaused={folder.isPaused}
            elapsed={folder.elapsed}
            status={folder.status}
          />

        ))}

      </div>


      <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-xs">

        {notifications.map(n => (

          <div
            key={n.id}
            className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded shadow-md"
          >

            <p className="font-bold mb-1">⏰ Alarme!</p>

            <p className="text-sm mb-2">{n.message}</p>

            <button
              onClick={() =>
                setNotifications(prev =>
                  prev.filter(item => item.id !== n.id)
                )
              }
              className="bg-yellow-800 text-white px-3 py-1 rounded text-xs"
            >
              Fechar
            </button>

          </div>

        ))}

      </div>

    </div>
  );
}