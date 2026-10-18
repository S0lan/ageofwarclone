import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '@aow/shared';
import { startServer, type RunningServer } from '../src/server';

let server: RunningServer;

beforeEach(async () => {
  server = await startServer(0);
});

afterEach(async () => {
  await server.close();
});

class TestClient {
  ws: WebSocket;
  inbox: ServerMessage[] = [];
  private waiters: { pred: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];

  constructor(port: number) {
    this.ws = new WebSocket(`ws://localhost:${port}`);
    this.ws.on('message', (data) => {
      const msg = JSON.parse(String(data)) as ServerMessage;
      this.inbox.push(msg);
      this.waiters = this.waiters.filter((w) => {
        if (!w.pred(msg)) return true;
        w.resolve(msg);
        return false;
      });
    });
  }

  open(): Promise<void> {
    return new Promise((r) => this.ws.once('open', () => r()));
  }

  send(msg: ClientMessage): void {
    this.ws.send(JSON.stringify(msg));
  }

  waitFor<T extends ServerMessage['t']>(t: T, pred: (m: Extract<ServerMessage, { t: T }>) => boolean = () => true) {
    const existing = this.inbox.find((m) => m.t === t && pred(m as Extract<ServerMessage, { t: T }>));
    if (existing) return Promise.resolve(existing as Extract<ServerMessage, { t: T }>);
    return new Promise<Extract<ServerMessage, { t: T }>>((resolve) => {
      this.waiters.push({
        pred: (m) => m.t === t && pred(m as Extract<ServerMessage, { t: T }>),
        resolve: resolve as (m: ServerMessage) => void,
      });
    });
  }
}

async function connect(): Promise<TestClient> {
  const c = new TestClient(server.port);
  await c.open();
  return c;
}

describe('server', () => {
  it('pairs two players through a room code and runs the game', async () => {
    const host = await connect();
    host.send({ t: 'create', options: { overtime: true, specialCooldown: 15 } });
    const room = await host.waitFor('room');
    expect(room.you).toBe(0);
    expect(room.code).toMatch(/^[A-Z]{4}$/);
    expect(room.options.overtime).toBe(true);
    expect(room.options.specialCooldown).toBe(30);

    const guest = await connect();
    guest.send({ t: 'join', code: room.code.toLowerCase() });
    const joined = await guest.waitFor('room');
    expect(joined.you).toBe(1);
    expect(joined.options.overtime).toBe(true);
    expect((await host.waitFor('start')).you).toBe(0);
    expect((await guest.waitFor('start')).you).toBe(1);

    guest.send({ t: 'cmd', cmd: { type: 'spawnUnit', unit: 0 } });
    const snap = await host.waitFor('snap', (m) => m.state.units.some((u) => u.owner === 1));
    expect(snap.state.players[1].gold).toBeLessThan(175);
    expect(snap.state.options.overtime).toBe(true);
    expect(snap.state.options.specialCooldown).toBe(30);
  });

  it('rejects unknown rooms and awards a forfeit when a player leaves', async () => {
    const stranger = await connect();
    stranger.send({ t: 'join', code: 'ZZZZ' });
    expect((await stranger.waitFor('error')).message).toContain('not found');

    const host = await connect();
    host.send({ t: 'create', options: { overtime: false } });
    const { code, options } = await host.waitFor('room');
    expect(options.overtime).toBe(false);
    const guest = await connect();
    guest.send({ t: 'join', code });
    await host.waitFor('start');

    guest.ws.close();
    await host.waitFor('opponentLeft');
    const snap = await host.waitFor('snap', (m) => m.state.winner !== null);
    expect(snap.state.winner).toBe(0);
  });
});
