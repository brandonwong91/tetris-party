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
    <div class="container">
      <h1 class="title">
        PartyKit Server Monitor
      </h1>

      <div class="grid-layout">
        <!-- Connected Players Section -->
        <div class="card">
          <h2 class="card-title">
            Connected Players
          </h2>
          <div id="players" class="players-grid"></div>
        </div>

        <!-- Server Logs Section -->
        <div class="card">
          <h2 class="card-title">
            Server Logs
          </h2>
          <div id="logs" class="logs-container"></div>
        </div>
      </div>
    </div>
  `;
}

function addLog(type: LogEntry["type"], data: unknown) {
  const logsContainer = document.getElementById("logs");
  if (!logsContainer) return;

  const logEntry = document.createElement("div");
  logEntry.className = `log-entry ${type}`;

  const timestamp = new Date().toISOString();
  logEntry.innerHTML = `
    <div class="log-timestamp">${timestamp}</div>
    <div class="log-header">
      <span class="status-indicator ${type}"></span>
      <span class="log-type">${type.toUpperCase()}</span>
    </div>
    <pre class="log-content">${JSON.stringify(data, null, 2)}</pre>
  `;

  logsContainer.insertBefore(logEntry, logsContainer.firstChild);
  if (logsContainer.children.length > 100) {
    logsContainer.removeChild(logsContainer.lastChild!);
  }
}

function updatePlayerList(
  players: Array<{
    id: string;
    username: string;
    board: (string | null)[][];
    score: number;
  }>
) {
  const playersContainer = document.getElementById("players");
  if (!playersContainer) return;

  playersContainer.innerHTML = players
    .map(
      (player) => `
    <div class="player-card">
      <div class="player-header">
        <div class="status-indicator connect"></div>
        <span class="player-name">${player.username}</span>
        <span class="player-id">(${player.id})</span>
      </div>
      <div class="player-score">
        Score: ${player.score}
      </div>
      <div class="game-board">
        ${player.board
          .map((row) =>
            row
              .map(
                (cell) =>
                  `<div class="board-cell ${cell ? "filled" : "empty"}"></div>`
              )
              .join("")
          )
          .join("")}
      </div>
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
