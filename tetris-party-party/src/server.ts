import type * as Party from "partykit/server";
import { generateUsername } from "./username";

type GameState = {
  players: Map<string, PlayerState>;
  usernames: Map<string, string>;
  isMultiplayerMode: boolean;
  gameStarted: boolean;
};

type PlayerStatus = "online" | "join" | "playing";

type PlayerState = {
  board: (string | null)[][];
  score: number;
  level: number;
  lines: number;
  isGameOver: boolean;
  status: PlayerStatus;
};

export default class TetrisParty implements Party.Server {
  private gameState: GameState = {
    players: new Map(),
    usernames: new Map(),
    isMultiplayerMode: false,
    gameStarted: false,
  };

  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection) {
    // Initialize player state
    this.gameState.players.set(conn.id, {
      board: Array(20)
        .fill(null)
        .map(() => Array(10).fill(null)),
      score: 0,
      level: 1,
      lines: 0,
      isGameOver: false,
      status: "online",
    });

    // Generate username
    const username = generateUsername();
    this.gameState.usernames.set(conn.id, username);

    // Broadcast updated player list
    this.broadcastGameState();
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const update = JSON.parse(message);
      const player = this.gameState.players.get(sender.id);

      if (update.type === "JOIN_MULTIPLAYER") {
        this.gameState.isMultiplayerMode = true;
        for (const [, playerState] of this.gameState.players) {
          if (playerState.status === "online") {
            playerState.status = "join";
            playerState.isGameOver = false;
          }
        }
        this.broadcastGameState();
        return;
      }

      if (
        update.type === "START_MULTIPLAYER" &&
        this.gameState.players.size > 1
      ) {
        this.gameState.gameStarted = true;
        // Get all joined players
        const joinedPlayers = Array.from(this.gameState.players.entries())
          .filter(([, state]) => state.status === "join")
          .map(([id]) => id);

        // Update joined players to playing status
        for (const playerId of joinedPlayers) {
          const playerState = this.gameState.players.get(playerId);
          if (playerState) {
            playerState.status = "playing";
            playerState.isGameOver = false;
          }
        }

        // Broadcast game start to all players
        this.party.broadcast(
          JSON.stringify({
            type: "START_GAME",
            players: joinedPlayers,
          })
        );
        return;
      }

      if (player) {
        // Update player state
        if (update.board) {
          const prevLines = player.lines;
          Object.assign(player, update);
          // Handle line clears and send garbage lines
          const linesCleared = player.lines - prevLines;
          if (linesCleared > 0 && this.gameState.isMultiplayerMode) {
            // Get all active players except the sender
            const otherPlayers = Array.from(this.gameState.players.entries())
              .filter(
                ([id, p]) =>
                  id !== sender.id && p.status === "playing" && !p.isGameOver
              )
              .map(([id]) => id);

            if (otherPlayers.length > 0) {
              // Create garbage lines with one random empty cell
              const garbageLines = Array(linesCleared)
                .fill(null)
                .map(() => {
                  const emptyCell = Math.floor(Math.random() * 10);
                  return Array(10)
                    .fill("G")
                    .map((cell, i) => (i === emptyCell ? null : cell));
                });

              // Send garbage lines to other players
              this.party.broadcast(
                JSON.stringify({
                  type: "GARBAGE_LINES",
                  lines: garbageLines,
                  recipients: otherPlayers,
                })
              );
            }
          }
          // Check if all active players are game over
          const activePlayers = Array.from(
            this.gameState.players.values()
          ).filter((p) => p.status === "playing");
          if (
            activePlayers.length > 0 &&
            activePlayers.every((p) => p.isGameOver)
          ) {
            this.gameState.gameStarted = false;
            this.gameState.isMultiplayerMode = false;
          }
        }
        // Broadcast updated game state to all players
        this.broadcastGameState();
      }
    } catch (e) {
      console.error("Error processing message:", e);
    }
  }

  onClose(conn: Party.Connection) {
    // Remove player when they disconnect
    this.gameState.players.delete(conn.id);
    this.gameState.usernames.delete(conn.id);

    // Reset game state if no players are left
    if (this.gameState.players.size === 0) {
      this.gameState.isMultiplayerMode = false;
      this.gameState.gameStarted = false;
    }

    // Reset multiplayer mode if only one player is left
    if (this.gameState.players.size === 1 && this.gameState.isMultiplayerMode) {
      this.gameState.isMultiplayerMode = false;
      this.gameState.gameStarted = false;
    }

    this.broadcastGameState();
  }

  private broadcastGameState() {
    // Convert Map to array for JSON serialization
    const players = Array.from(this.gameState.players.entries()).map(
      ([id, state]) => ({
        id,
        ...state,
        username:
          this.gameState.usernames.get(id) || `Player ${id.slice(0, 4)}`,
      })
    );

    this.party.broadcast(
      JSON.stringify({
        players,
        isMultiplayerMode: this.gameState.isMultiplayerMode,
        gameStarted: this.gameState.gameStarted,
      })
    );
  }
}

TetrisParty satisfies Party.Worker;
