# Age of War Clone

A browser-based clone of Age of War written in TypeScript and HTML5 Canvas. You can play against the computer (easy, normal, or hard) or against another player online using room codes.

## Running

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Game server (WebSocket): ws://localhost:8080

To play online, one player clicks **Create online room** and shares the 4-letter code. The other player enters the code and clicks **Join room**. To play across machines on your local network, open the client using the host's network address (Vite prints it on startup).

### Production

```bash
npm run build   # builds the client into packages/client/dist
npm start       # serves the client and the WebSocket server on PORT (default 8080)
```

Set `VITE_SERVER_URL` at build time if the game server runs on a different host than the client.

## Controls

| Key | Action |
| --- | --- |
| 1 / 2 / 3 | Train melee / ranged / heavy unit |
| Q / W | Build turret in the first empty slot |
| E | Evolve to the next age |
| S or Space | Special attack |
| Esc | Pause (vs computer) or menu (online) |

Click a turret slot to sell it for half its cost.

## Rules

- Units walk toward the enemy base and fight whatever they meet. Ranged units can shoot over the units in front of them.
- Kills give gold and XP. Spend XP to evolve: Stone Age, then Medieval Age, then Modern Age. Each age has stronger units, turrets, a sturdier base, and more passive income.
- Each age has a special attack with a 60-second cooldown.
- Destroy the enemy base to win. After 12 minutes the game goes into overtime: both bases lose HP over time, so the player with more base HP wins any stalemate.

## Project layout

- `packages/shared`: game data (`data.ts`), deterministic simulation (`sim.ts`), commands, and the network protocol. It has no rendering code.
- `packages/client`: Vite app with the Canvas renderer, DOM HUD, AI opponent, sound, and networking.
- `packages/server`: Node WebSocket server. Each room runs the shared simulation as the authority and broadcasts snapshots at 20 Hz.

Player vs Computer runs the simulation in the browser. Online games run it on the server, and clients only send commands and render interpolated snapshots. Player 2's view is mirrored so each player sees their own base on the left.

## Tests

```bash
npm test         # simulation, AI, and server integration tests
npm run typecheck
```
