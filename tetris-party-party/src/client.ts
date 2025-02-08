import "./styles.css";
import PartySocket from "partysocket";

declare const PARTYKIT_HOST: string;

type LogEntry = {
  timestamp: string;
  type: "connect" | "disconnect" | "message" | "error";
  data: unknown;
};

const app = document.getElementById("app") as HTMLDivElement;

function createMonitorUI() {
  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 text-white p-4">
      <h1 class="text-2xl font-bold mb-4">PartyKit Server Monitor</h1>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 class="text-xl font-semibold mb-2">Server Logs</h2>
          <div id="logs" class="space-y-2 h-[600px] overflow-y-auto"></div>
        </div>
        <div class="bg-gray-800 rounded-lg p-4">
          <h2 class="text-xl font-semibold mb-2">Connected Players</h2>
          <div id="players" class="space-y-2"></div>
        </div>
      </div>
    </div>
  `;
}

function addLog(type: LogEntry["type"], data: unknown) {
  const logsContainer = document.getElementById("logs");
  if (!logsContainer) return;

  const logEntry = document.createElement("div");
  logEntry.className = `p-2 rounded ${
    {
      connect: "bg-green-900",
      disconnect: "bg-red-900",
      message: "bg-gray-700",
      error: "bg-red-900",
    }[type]
  }`;

  const timestamp = new Date().toISOString();
  logEntry.innerHTML = `
    <div class="text-xs text-gray-400">${timestamp}</div>
    <div class="flex items-center gap-2">
      <span class="inline-block w-2 h-2 rounded-full ${
        {
          connect: "bg-green-500",
          disconnect: "bg-red-500",
          message: "bg-blue-500",
          error: "bg-red-500",
        }[type]
      }"></span>
      <span class="font-medium">${type.toUpperCase()}</span>
    </div>
    <pre class="mt-1 text-sm overflow-x-auto">${JSON.stringify(
      data,
      null,
      2
    )}</pre>
  `;

  logsContainer.insertBefore(logEntry, logsContainer.firstChild);
  if (logsContainer.children.length > 100) {
    logsContainer.removeChild(logsContainer.lastChild!);
  }
}

function updatePlayerList(players: Array<{ id: string; username: string }>) {
  const playersContainer = document.getElementById("players");
  if (!playersContainer) return;

  playersContainer.innerHTML = players
    .map(
      (player) => `
    <div class="flex items-center gap-2 bg-gray-700 p-2 rounded">
      <div class="w-2 h-2 rounded-full bg-green-500"></div>
      <span>${player.username}</span>
      <span class="text-xs text-gray-400">(${player.id})</span>
    </div>
  `
    )
    .join("");
}

createMonitorUI();

const socket = new PartySocket({
  host: PARTYKIT_HOST,
  room: "tetris",
});

socket.addEventListener("open", () => {
  addLog("connect", "Connected to server");
});

socket.addEventListener("close", () => {
  addLog("disconnect", "Disconnected from server");
});

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  addLog("message", data);
  if (data.players) {
    updatePlayerList(data.players);
  }
});

socket.addEventListener("error", (error) => {
  addLog("error", error);
});
