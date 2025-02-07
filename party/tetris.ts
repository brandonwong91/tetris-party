import { generateUsername } from "@/app/lib/username";
import type * as Party from "partykit/server";

type GameState = {
  players: Map<string, PlayerState>;
  usernames: Map<string, string>;
};

type PlayerState = {
  board: (string | null)[][];
  score: number;
  level: number;
  lines: number;
};

export default class TetrisParty implements Party.Server {
  private gameState: GameState = {
    players: new Map(),
    usernames: new Map(),
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

      if (player) {
        // Update player state
        Object.assign(player, update);
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

    this.party.broadcast(JSON.stringify({ players }));
  }
}
