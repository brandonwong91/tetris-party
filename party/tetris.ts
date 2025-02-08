import { generateUsername } from "@/app/lib/username";
import type * as Party from "partykit/server";

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

    // Generate username if not exists
    if (!this.gameState.usernames.has(conn.id)) {
      const username = generateUsername();
      this.gameState.usernames.set(conn.id, username);
    }

    // Broadcast updated player list
    this.broadcastGameState();
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const update = JSON.parse(message);
      const player = this.gameState.players.get(sender.id);

      if (update.type === "JOIN_MULTIPLAYER") {
        this.gameState.isMultiplayerMode = true;
        if (player) {
          player.status = "join";
          player.isGameOver = false;
        }
        this.broadcastGameState();
        return;
      }

      if (
        update.type === "START_MULTIPLAYER" &&
        this.gameState.players.size > 1
      ) {
        this.gameState.gameStarted = true;
        // Update all joined players to playing status
        for (const [, playerState] of this.gameState.players) {
          if (playerState.status === "join") {
            playerState.status = "playing";
            playerState.isGameOver = false;
          }
        }
        this.party.broadcast(JSON.stringify({ type: "START_GAME" }));
        return;
      }

      if (player) {
        // Update player state
        if (update.board) {
          Object.assign(player, update);
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
