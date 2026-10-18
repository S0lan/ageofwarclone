import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clampSpecialCooldown, parseCommand, type ClientMessage } from '@aow/shared';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomManager } from './rooms';

const HEARTBEAT_MS = 10_000;
const STATIC_DIR = resolve(fileURLToPath(import.meta.url), '../../../client/dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
};

export function parseClientMessage(data: unknown): ClientMessage | null {
  try {
    const msg = JSON.parse(String(data));
    if (!msg || typeof msg !== 'object') return null;
    switch (msg.t) {
      case 'create':
        return {
          t: 'create',
          options: {
            overtime: msg.options?.overtime === true,
            specialCooldown: clampSpecialCooldown(msg.options?.specialCooldown),
          },
        };
      case 'rematch':
      case 'leave':
        return { t: msg.t };
      case 'join':
        return typeof msg.code === 'string' && msg.code.length <= 10 ? { t: 'join', code: msg.code } : null;
      case 'cmd': {
        const cmd = parseCommand(msg.cmd);
        return cmd ? { t: 'cmd', cmd } : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export interface RunningServer {
  port: number;
  close(): Promise<void>;
}

export function startServer(port: number): Promise<RunningServer> {
  const http = createServer((req, res) => {
    if (!existsSync(STATIC_DIR)) {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('Age of War server is running. Build the client (npm run build) to serve it from here.');
      return;
    }
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = normalize(join(STATIC_DIR, urlPath));
    if (file !== STATIC_DIR && !file.startsWith(STATIC_DIR + sep)) {
      res.writeHead(403).end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(STATIC_DIR, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });

  const wss = new WebSocketServer({ server: http, maxPayload: 4096 });
  const rooms = new RoomManager();
  const alive = new WeakMap<WebSocket, boolean>();

  wss.on('connection', (ws) => {
    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));

    ws.on('message', (data) => {
      const msg = parseClientMessage(data);
      if (!msg) return;
      switch (msg.t) {
        case 'create':
          rooms.create(ws, msg.options);
          break;
        case 'join':
          rooms.join(ws, msg.code);
          break;
        case 'cmd':
          rooms.roomOf(ws)?.command(ws, msg.cmd);
          break;
        case 'rematch':
          rooms.roomOf(ws)?.voteRematch(ws);
          break;
        case 'leave':
          rooms.leave(ws);
          break;
      }
    });

    ws.on('close', () => rooms.leave(ws));
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.get(ws)) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, HEARTBEAT_MS);

  return new Promise((resolveStart) => {
    http.listen(port, () => {
      resolveStart({
        port: (http.address() as AddressInfo).port,
        close: () =>
          new Promise<void>((done) => {
            clearInterval(heartbeat);
            for (const ws of wss.clients) ws.terminate();
            wss.close(() => http.close(() => done()));
          }),
      });
    });
  });
}
