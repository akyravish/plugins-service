/**
 * Express application setup.
 * Configures all middleware and security settings.
 */

import express, { Express, CookieOptions, Router } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';

import { config, APP_CONSTANTS } from '../config';
import {
  errorHandler,
  setErrorLogger,
  globalRateLimiter,
  requestIdMiddleware,
  requestLoggerMiddleware,
  setRequestLogger,
  sanitizeMiddleware,
  timeoutMiddleware,
} from '../common/middleware';
import { checkDatabaseHealth } from '../shared/db/prisma';
import { checkRedisHealth } from '../shared/cache/redis';
import { checkKafkaHealth } from '../shared/messaging';
import logger from './logger';

/**
 * Create and configure the Express application
 */
export function createApp(): Express {
  const app = express();

  // Set logger for middleware
  setErrorLogger(logger);
  setRequestLogger(logger);

  // Disable x-powered-by header
  app.disable('x-powered-by');

  // Trust proxy in production (for rate limiting, logging real IPs)
  if (config.isProduction) {
    app.enable('trust proxy');

    // Redirect HTTP to HTTPS in production
    app.use((req, res, next) => {
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
      if (proto !== 'https') {
        const host = req.headers.host;
        if (!host || typeof host !== 'string') {
          return res.status(400).json({ error: 'Invalid host header' });
        }
        // Validate host header
        const validHostPattern = /^[a-zA-Z0-9.-]+(:\d+)?$/;
        if (!validHostPattern.test(host)) {
          return res.status(400).json({ error: 'Invalid host header format' });
        }
        const sanitizedHost = host.split('/')[0].split('?')[0].split('#')[0];
        const url = `https://${sanitizedHost}${req.originalUrl}`;
        return res.redirect(301, url);
      }
      next();
    });
  }

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: config.isProduction
        ? { maxAge: 15552000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      xContentTypeOptions: true,
      xFrameOptions: { action: 'deny' },
    }),
  );

  // CORS configuration
  app.use(
    cors({
      origin: config.isProduction ? false : true, // Configure specific origins in production
      credentials: true,
    }),
  );

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: APP_CONSTANTS.MAX_PAYLOAD_SIZE }));
  app.use(express.urlencoded({ limit: APP_CONSTANTS.MAX_URL_ENCODED_SIZE, extended: true }));

  // Cookie parsing
  app.use(cookieParser());

  // HTTP Parameter Pollution protection
  app.use(hpp());

  // Request ID middleware
  app.use(requestIdMiddleware);

  // Request timeout middleware
  app.use(timeoutMiddleware);

  // Input sanitization
  app.use(sanitizeMiddleware);

  // Request logging
  app.use(requestLoggerMiddleware);

  // Permissions-Policy header
  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
    );
    next();
  });

  // Cookie hardening
  app.use((req, res, next) => {
    const originalCookie = res.cookie.bind(res);
    res.cookie = (name: string, value: unknown, options: CookieOptions = {}) => {
      return originalCookie(name, value, {
        httpOnly: true,
        sameSite: APP_CONSTANTS.COOKIE_SAME_SITE,
        secure: config.isProduction,
        ...options,
      });
    };
    next();
  });

  // Rate limiting
  app.use(globalRateLimiter);

  // Health check endpoint
  const healthRouter = Router();
  healthRouter.get('/', async (_req, res) => {
    try {
      const [dbHealthy, redisHealthy, kafkaHealthy] = await Promise.all([
        checkDatabaseHealth(),
        checkRedisHealth(),
        config.kafka.enabled ? checkKafkaHealth() : Promise.resolve(true),
      ]);

      const allHealthy = dbHealthy && redisHealthy && (config.kafka.enabled ? kafkaHealthy : true);
      const status = allHealthy ? 'ok' : 'degraded';
      const statusCode = status === 'ok' ? 200 : 503;

      const services: Record<string, string> = {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      };

      if (config.kafka.enabled) {
        services.kafka = kafkaHealthy ? 'connected' : 'disconnected';
      }

      return res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        services,
      });
    } catch {
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
      });
    }
  });
  app.use('/health', healthRouter);

  return app;
}

/**
 * Register the global error handler.
 * Must be called after all routes are registered.
 */
export function registerErrorHandler(app: Express): void {
  app.use(errorHandler);
}

export default createApp;

