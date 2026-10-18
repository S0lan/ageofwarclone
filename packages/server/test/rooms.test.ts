import { afterEach, describe, expect, it } from 'vitest';
import type { GameState, ServerMessage } from '@aow/shared';
import type { WebSocket } from 'ws';
import { Room } from '../src/rooms';

function fakeSocket() {
  const sent: ServerMessage[] = [];
  const ws = { OPEN: 1, readyState: 1, send: (data: string) => sent.push(JSON.parse(data)) };
  return { ws: ws as unknown as WebSocket, sent };
}

let room: Room;
afterEach(() => room.dispose());

describe('Room', () => {
  it('restarts the game once both players vote for a rematch', () => {
    room = new Room('ABCD');
    const a = fakeSocket();
    const b = fakeSocket();
    room.add(a.ws);
    room.add(b.ws);
    expect(a.sent.filter((m) => m.t === 'start')).toHaveLength(1);

    room.voteRematch(a.ws);
    expect(a.sent.filter((m) => m.t === 'rematchVote')).toHaveLength(0);

    (room as unknown as { state: GameState }).state.winner = 1;
    room.voteRematch(a.ws);
    expect(b.sent.at(-1)).toEqual({ t: 'rematchVote', from: 0 });
    room.voteRematch(b.ws);
    expect(a.sent.filter((m) => m.t === 'start')).toHaveLength(2);
    expect(b.sent.filter((m) => m.t === 'start')).toHaveLength(2);
  });
});
