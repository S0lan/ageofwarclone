import {
  DEFAULT_SERVER_PORT,
  type ClientMessage,
  type Command,
  type GameEvent,
  type GameState,
  type PlayerId,
  type ServerMessage,
} from '@aow/shared';
import { interpolate } from './interp';
import type { GameSession } from './session';

/** How far behind the newest snapshot we render, so there are usually two snapshots to blend between. */
const INTERP_DELAY_MS = 100;
const SNAPSHOT_HISTORY_MS = 1000;

export function serverUrl(): string {
  const configured = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (configured) return configured;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  // In dev the client is served by Vite, so the game server is on its own port.
  return import.meta.env.DEV ? `${proto}://${location.hostname}:${DEFAULT_SERVER_PORT}` : `${proto}://${location.host}`;
}

export class NetClient {
  onMessage: (msg: ServerMessage) => void = () => {};
  onClose: () => void = () => {};

  private constructor(private ws: WebSocket) {
    ws.onmessage = (e) => this.onMessage(JSON.parse(e.data) as ServerMessage);
    ws.onclose = () => this.onClose();
  }

  static connect(url = serverUrl()): Promise<NetClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => resolve(new NetClient(ws));
      ws.onerror = () => reject(new Error(`Could not connect to game server at ${url}`));
    });
  }

  send(msg: ClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.ws.onclose = null;
    this.ws.close();
  }
}

interface TimedSnapshot {
  time: number;
  state: GameState;
}

export class OnlineSession implements GameSession {
  readonly isOnline = true;
  private snapshots: TimedSnapshot[] = [];
  private events: GameEvent[] = [];

  constructor(
    private net: NetClient,
    readonly myId: PlayerId,
  ) {}

  receive(state: GameState, events: GameEvent[]): void {
    const now = performance.now();
    this.snapshots.push({ time: now, state });
    this.events.push(...events);
    while (this.snapshots.length > 2 && now - this.snapshots[0].time > SNAPSHOT_HISTORY_MS) this.snapshots.shift();
  }

  /** The newest authoritative state, used for game-over checks rather than drawing. */
  get latest(): GameState | null {
    return this.snapshots.at(-1)?.state ?? null;
  }

  frame(): GameState | null {
    const snaps = this.snapshots;
    if (snaps.length === 0) return null;
    const latest = snaps[snaps.length - 1];
    if (latest.state.winner !== null) return latest.state;

    const renderTime = performance.now() - INTERP_DELAY_MS;
    for (let i = snaps.length - 1; i > 0; i--) {
      const a = snaps[i - 1];
      const b = snaps[i];
      if (a.time <= renderTime && renderTime <= b.time) {
        return interpolate(a.state, b.state, (renderTime - a.time) / (b.time - a.time || 1));
      }
    }
    return renderTime < snaps[0].time ? snaps[0].state : latest.state;
  }

  send(cmd: Command): void {
    this.net.send({ t: 'cmd', cmd });
  }

  takeEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  dispose(): void {}
}
