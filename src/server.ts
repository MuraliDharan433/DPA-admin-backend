import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { setIo } from './sockets/io';
import { registerNotificationsGateway } from './sockets/notifications.gateway';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const httpServer = createServer(app);

  const allowedOrigins = [env.cors.frontendUrl, ...env.cors.publicWebsiteUrls].filter(Boolean);
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });
  setIo(io);
  registerNotificationsGateway(io);

  httpServer.listen(env.port, () => {
    logger.log(`Institute Management API running on http://localhost:${env.port}/${env.apiPrefix}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
