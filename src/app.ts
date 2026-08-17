import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { globalRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import routes from './routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());

  const allowedOrigins = [env.cors.frontendUrl, ...env.cors.publicWebsiteUrls].filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  app.use(cookieParser(env.cookieSecret));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  app.use(globalRateLimiter);

  app.get('/health', (_req, res) => res.json({ success: true, message: 'ok', data: { uptime: process.uptime() } }));

  app.use(`/${env.apiPrefix}`, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
