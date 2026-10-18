import { DEFAULT_SERVER_PORT } from '@aow/shared';
import { startServer } from './server';

const port = Number(process.env.PORT) || DEFAULT_SERVER_PORT;

startServer(port).then((s) => {
  console.log(`Age of War server listening on http://localhost:${s.port} (WebSocket on the same port)`);
});
