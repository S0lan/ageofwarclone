import type { Command } from './commands';
import type { GameEvent, GameState, PlayerId } from './sim';

export const DEFAULT_SERVER_PORT = 8080;
export const ROOM_CODE_LENGTH = 4;

export type ClientMessage =
  | { t: 'create' }
  | { t: 'join'; code: string }
  | { t: 'cmd'; cmd: Command }
  | { t: 'rematch' }
  | { t: 'leave' };

export type ServerMessage =
  | { t: 'room'; code: string; you: PlayerId }
  | { t: 'start'; you: PlayerId }
  | { t: 'snap'; state: GameState; events: GameEvent[] }
  | { t: 'rematchVote'; from: PlayerId }
  | { t: 'opponentLeft' }
  | { t: 'error'; message: string };
