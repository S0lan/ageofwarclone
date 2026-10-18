import type { GameState, PlayerId, ServerMessage } from '@aow/shared';
import { AiController, type Difficulty } from './ai';
import { Sound } from './audio';
import { Hud } from './hud';
import { NetClient, OnlineSession } from './net';
import { Renderer } from './render';
import { LocalSession, type GameSession } from './session';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay')!;
const renderer = new Renderer(canvas);
const sound = new Sound();

let session: GameSession | null = null;
let net: NetClient | null = null;
let roomCode = '';
let difficulty: Difficulty = (localStorage.getItem('aow-difficulty') as Difficulty) || 'normal';
let gameOver = false;
let paused = false;
let opponentGone = false;
let forfeitWin = false;

const hud = new Hud(document.getElementById('hud')!, (cmd) => {
  if (!gameOver && !paused) session?.send(cmd);
});

document.addEventListener('pointerdown', () => sound.unlock());

const CONTROLS_HELP = `
  <div class="help">
    <b>1 2 3</b> train units &middot; <b>Q W</b> build turrets &middot; <b>E</b> evolve &middot;
    <b>S</b> / <b>Space</b> special &middot; <b>Esc</b> menu<br>
    Kill enemies for gold and XP. Spend XP to evolve. Destroy the enemy base to win.
  </div>`;

function show(html: string): void {
  overlay.innerHTML = `<div class="screen">${html}</div>`;
}

function $(selector: string): HTMLElement {
  return overlay.querySelector(selector) as HTMLElement;
}

function on(selector: string, handler: () => void): void {
  const el = overlay.querySelector<HTMLElement>(selector);
  if (el) el.onclick = handler;
}

function endSession(): void {
  session?.dispose();
  session = null;
  gameOver = false;
  paused = false;
  opponentGone = false;
  hud.hide();
}

function showMenu(error = ''): void {
  endSession();
  if (net && roomCode) net.send({ t: 'leave' });
  roomCode = '';
  show(`
    <h1>Age of War</h1>
    <p>Defend your base. Destroy theirs.</p>
    <div class="menu">
      <div class="inline">
        <button class="primary" id="pvc">Play vs Computer</button>
        <select id="difficulty">
          ${(['easy', 'normal', 'hard'] as const)
            .map((d) => `<option value="${d}" ${d === difficulty ? 'selected' : ''}>${d[0].toUpperCase() + d.slice(1)}</option>`)
            .join('')}
        </select>
      </div>
      <button id="create">Create online room</button>
      <div class="inline">
        <input id="code" maxlength="4" placeholder="CODE" autocomplete="off" />
        <button id="join">Join room</button>
      </div>
      <button id="mute">${sound.muted ? 'Sound: off' : 'Sound: on'}</button>
    </div>
    <div class="error">${error}</div>
    ${CONTROLS_HELP}`);

  const select = $('#difficulty') as HTMLSelectElement;
  select.onchange = () => {
    difficulty = select.value as Difficulty;
    localStorage.setItem('aow-difficulty', difficulty);
  };
  on('#pvc', startLocal);
  on('#create', () => void connectAnd({ t: 'create' }));
  const codeInput = $('#code') as HTMLInputElement;
  const join = () => {
    const code = codeInput.value.trim().toUpperCase();
    if (code.length === 4) void connectAnd({ t: 'join', code });
    else $('.error').textContent = 'Enter the 4-letter room code';
  };
  on('#join', join);
  codeInput.onkeydown = (e) => {
    if (e.key === 'Enter') join();
  };
  on('#mute', () => {
    $('#mute').textContent = sound.toggleMute() ? 'Sound: off' : 'Sound: on';
  });
}

function beginGame(s: GameSession, info: string): void {
  endSession();
  session = s;
  renderer.setPerspective(s.myId);
  overlay.innerHTML = '';
  hud.show(info);
}

function startLocal(): void {
  const name = difficulty[0].toUpperCase() + difficulty.slice(1);
  beginGame(new LocalSession(new AiController(1, difficulty)), `vs Computer (${name})`);
}

async function connectAnd(msg: { t: 'create' } | { t: 'join'; code: string }): Promise<void> {
  show(`<h2>Connecting...</h2>`);
  try {
    if (!net) {
      net = await NetClient.connect();
      net.onMessage = handleServer;
      net.onClose = () => {
        net = null;
        if (roomCode || session?.isOnline) showMenu('Lost connection to the game server.');
      };
    }
    net.send(msg);
  } catch (e) {
    showMenu(`${(e as Error).message}. Is the server running (npm run dev)?`);
  }
}

function showLobby(code: string): void {
  show(`
    <h2>Online room</h2>
    <p>Share this code with your opponent:</p>
    <div class="code">${code}</div>
    <p>Waiting for an opponent to join...</p>
    <div class="menu"><button id="cancel">Cancel</button></div>`);
  on('#cancel', () => showMenu());
}

function handleServer(msg: ServerMessage): void {
  switch (msg.t) {
    case 'room':
      roomCode = msg.code;
      if (msg.you === 0) showLobby(msg.code);
      else show(`<h2>Joined room ${msg.code}</h2><p>Starting...</p>`);
      break;
    case 'start':
      beginGame(new OnlineSession(net!, msg.you), `Online room ${roomCode} - you are Player ${msg.you + 1}`);
      break;
    case 'snap':
      if (session instanceof OnlineSession) session.receive(msg.state, msg.events);
      break;
    case 'rematchVote':
      if (session && gameOver) {
        const note = $('#note');
        if (note) note.textContent = msg.from === session.myId ? 'Waiting for opponent...' : 'Opponent wants a rematch!';
      }
      break;
    case 'opponentLeft':
      opponentGone = true;
      if (gameOver) markOpponentGone();
      break;
    case 'error':
      if (session) break;
      roomCode = '';
      showMenu(msg.message);
      break;
  }
}

function markOpponentGone(): void {
  const note = $('#note');
  if (note) note.textContent = 'Your opponent left the game.';
  const reason = $('#reason');
  if (reason && forfeitWin) reason.textContent = 'Your opponent forfeited.';
  const rematch = $('#again') as HTMLButtonElement | null;
  if (rematch) rematch.disabled = true;
}

function showGameOver(winner: PlayerId, state: GameState): void {
  if (!session) return;
  gameOver = true;
  const won = winner === session.myId;
  forfeitWin = won && state.players[winner === 0 ? 1 : 0].baseHp > 0;
  const online = session.isOnline;
  show(`
    <h1>${won ? 'Victory!' : 'Defeat'}</h1>
    <p id="reason">${won ? 'The enemy base has fallen.' : 'Your base has been destroyed.'}</p>
    <div class="menu">
      <button class="primary" id="again">${online ? 'Rematch' : 'Play again'}</button>
      <button id="menu">Main menu</button>
    </div>
    <div class="error" id="note"></div>`);
  on('#again', () => {
    if (!online) return startLocal();
    net?.send({ t: 'rematch' });
  });
  on('#menu', () => showMenu());
  if (online && opponentGone) markOpponentGone();
}

function togglePause(): void {
  if (!session || gameOver) return;
  paused = !paused;
  if (session instanceof LocalSession) session.paused = paused;
  if (!paused) {
    overlay.innerHTML = '';
    return;
  }
  const online = session.isOnline;
  show(`
    <h2>${online ? 'Menu' : 'Paused'}</h2>
    ${online ? '<p>The game keeps running while this menu is open.</p>' : ''}
    <div class="menu">
      <button class="primary" id="resume">Resume</button>
      <button id="mute">${sound.muted ? 'Sound: off' : 'Sound: on'}</button>
      <button id="quit">${online ? 'Forfeit and leave' : 'Quit to menu'}</button>
    </div>
    ${CONTROLS_HELP}`);
  on('#resume', togglePause);
  on('#quit', () => showMenu());
  on('#mute', () => {
    $('#mute').textContent = sound.toggleMute() ? 'Sound: off' : 'Sound: on';
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') togglePause();
});

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  if (session) {
    const state = session.frame(dt);
    if (state) {
      const events = session.takeEvents();
      renderer.handleEvents(events);
      sound.play(events, session.myId);
      renderer.draw(state, dt);
      hud.update(state, session.myId);
      if (state.winner !== null && !gameOver) showGameOver(state.winner, state);
    }
  }
  requestAnimationFrame(loop);
}

showMenu();
requestAnimationFrame(loop);
