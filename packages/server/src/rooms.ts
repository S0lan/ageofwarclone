import {
  ROOM_CODE_LENGTH,
  SNAPSHOT_RATE,
  TICK_RATE,
  applyCommand,
  createGame,
  forfeit,
  other,
  step,
  takeEvents,
  type Command,
  type GameEvent,
  type GameState,
  type PlayerId,
  type ServerMessage,
} from '@aow/shared';
import type { WebSocket } from 'ws';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const TICK_MS = 1000 / TICK_RATE;
const MAX_CATCHUP_TICKS = 10;

function send(ws: WebSocket | null, msg: ServerMessage): void {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

export class Room {
  readonly players: [WebSocket | null, WebSocket | null] = [null, null];
  private state: GameState | null = null;
  private pendingEvents: GameEvent[] = [];
  private rematchVotes = new Set<PlayerId>();
  private simTimer: NodeJS.Timeout | null = null;
  private snapTimer: NodeJS.Timeout | null = null;
  private lastTime = 0;
  private acc = 0;

  constructor(readonly code: string) {}

  get isFull(): boolean {
    return this.players[0] !== null && this.players[1] !== null;
  }

  get isEmpty(): boolean {
    return this.players[0] === null && this.players[1] === null;
  }

  add(ws: WebSocket): PlayerId | null {
    const slot = this.players[0] === null ? 0 : this.players[1] === null ? 1 : null;
    if (slot === null) return null;
    this.players[slot] = ws;
    send(ws, { t: 'room', code: this.code, you: slot });
    if (this.isFull) this.start();
    return slot;
  }

  remove(ws: WebSocket): void {
    const slot = this.players.indexOf(ws);
    if (slot < 0) return;
    const id = slot as PlayerId;
    this.players[id] = null;
    this.rematchVotes.clear();
    if (this.state && this.state.winner === null) {
      forfeit(this.state, id);
      this.pendingEvents.push(...takeEvents(this.state));
      this.broadcastSnapshot();
    }
    this.stopLoops();
    send(this.players[other(id)], { t: 'opponentLeft' });
  }

  command(ws: WebSocket, cmd: Command): void {
    const id = this.players.indexOf(ws);
    if (id < 0 || !this.state) return;
    applyCommand(this.state, id as PlayerId, cmd);
  }

  voteRematch(ws: WebSocket): void {
    const slot = this.players.indexOf(ws);
    if (slot < 0 || !this.isFull || !this.state || this.state.winner === null) return;
    const id = slot as PlayerId;
    this.rematchVotes.add(id);
    for (const p of this.players) send(p, { t: 'rematchVote', from: id });
    if (this.rematchVotes.size === 2) this.start();
  }

  private start(): void {
    this.stopLoops();
    this.rematchVotes.clear();
    this.state = createGame((Math.random() * 2 ** 32) >>> 0);
    this.pendingEvents = [];
    this.players.forEach((ws, i) => send(ws, { t: 'start', you: i as PlayerId }));
    this.lastTime = performance.now();
    this.acc = 0;
    this.simTimer = setInterval(() => this.tick(), TICK_MS / 2);
    this.snapTimer = setInterval(() => this.broadcastSnapshot(), 1000 / SNAPSHOT_RATE);
    this.broadcastSnapshot();
  }

  private tick(): void {
    const state = this.state;
    if (!state) return;
    const now = performance.now();
    this.acc = Math.min(this.acc + now - this.lastTime, TICK_MS * MAX_CATCHUP_TICKS);
    this.lastTime = now;
    while (this.acc >= TICK_MS) {
      step(state);
      this.acc -= TICK_MS;
    }
    this.pendingEvents.push(...takeEvents(state));
    if (state.winner !== null) {
      this.broadcastSnapshot();
      this.stopLoops();
    }
  }

  private broadcastSnapshot(): void {
    if (!this.state) return;
    this.pendingEvents.push(...takeEvents(this.state));
    const msg: ServerMessage = { t: 'snap', state: this.state, events: this.pendingEvents };
    const json = JSON.stringify(msg);
    this.pendingEvents = [];
    for (const ws of this.players) if (ws && ws.readyState === ws.OPEN) ws.send(json);
  }

  private stopLoops(): void {
    if (this.simTimer) clearInterval(this.simTimer);
    if (this.snapTimer) clearInterval(this.snapTimer);
    this.simTimer = this.snapTimer = null;
  }

  dispose(): void {
    this.stopLoops();
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private byClient = new Map<WebSocket, Room>();

  get roomCount(): number {
    return this.rooms.size;
  }

  create(ws: WebSocket): void {
    this.leave(ws);
    let code: string;
    do {
      code = Array.from({ length: ROOM_CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
    } while (this.rooms.has(code));
    const room = new Room(code);
    this.rooms.set(code, room);
    this.byClient.set(ws, room);
    room.add(ws);
  }

  join(ws: WebSocket, rawCode: string): void {
    const code = rawCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return send(ws, { t: 'error', message: `Room ${code} not found` });
    if (room.isFull) return send(ws, { t: 'error', message: `Room ${code} is full` });
    this.leave(ws);
    this.byClient.set(ws, room);
    room.add(ws);
  }

  roomOf(ws: WebSocket): Room | undefined {
    return this.byClient.get(ws);
  }

  leave(ws: WebSocket): void {
    const room = this.byClient.get(ws);
    if (!room) return;
    this.byClient.delete(ws);
    room.remove(ws);
    if (room.isEmpty) {
      room.dispose();
      this.rooms.delete(room.code);
    }
  }
}
