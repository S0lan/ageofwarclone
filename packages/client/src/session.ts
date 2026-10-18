import {
  DT,
  applyCommand,
  createGame,
  step,
  takeEvents,
  type Command,
  type GameEvent,
  type GameOptions,
  type GameState,
  type PlayerId,
} from '@aow/shared';
import { interpolate } from './interp';

export interface GameSession {
  readonly myId: PlayerId;
  readonly isOnline: boolean;
  /** Advances local time and returns the state to draw this frame, or null before the first state is known. */
  frame(dtSeconds: number): GameState | null;
  send(cmd: Command): void;
  takeEvents(): GameEvent[];
  dispose(): void;
}

export interface Controller {
  update(state: GameState): Command | null;
}

const MAX_FRAME = 0.25;

export class LocalSession implements GameSession {
  readonly myId: PlayerId = 0;
  readonly isOnline = false;
  paused = false;
  private state: GameState;
  private prev: GameState;
  private acc = 0;
  private events: GameEvent[] = [];

  constructor(
    private opponent: Controller | null,
    options: Partial<GameOptions> = {},
  ) {
    this.state = createGame((Math.random() * 2 ** 32) >>> 0, options);
    this.prev = structuredClone(this.state);
  }

  frame(dtSeconds: number): GameState {
    if (!this.paused) this.acc += Math.min(dtSeconds, MAX_FRAME);
    while (this.acc >= DT) {
      this.prev = structuredClone(this.state);
      const cmd = this.opponent?.update(this.state);
      if (cmd) applyCommand(this.state, 1, cmd);
      step(this.state);
      this.events.push(...takeEvents(this.state));
      this.acc -= DT;
    }
    return interpolate(this.prev, this.state, this.acc / DT);
  }

  send(cmd: Command): void {
    applyCommand(this.state, this.myId, cmd);
    this.events.push(...takeEvents(this.state));
  }

  takeEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  dispose(): void {}
}
