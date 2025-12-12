/**
 * Pino logger configuration.
 * Provides structured logging with pretty printing in development.
 */

import pino, { Logger } from 'pino';
import { config } from '../config';

/**
 * Create the application logger.
 */
function createLogger(): Logger {
  const isProd = config.isProduction;
  const usePretty = !isProd && config.logFormat === 'pretty';

  if (isProd) {
    // Production: JSON format, minimal overhead
    return pino({
      level: config.logLevel,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    });
  }

  // Development: Pretty printing if enabled
  return pino({
    level: config.logLevel,
    transport: usePretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{msg}',
            hideObject: false,
            customColors: 'info:blue,warn:yellow,error:red,debug:gray',
          },
        }
      : undefined,
  });
}

/**
 * Main application logger instance.
 */
export const logger: Logger = createLogger();

/**
 * Create a child logger with additional context.
 * Useful for creating plugin-specific loggers.
 */
export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

/**
 * Create a plugin-scoped logger.
 */
export function createPluginLogger(pluginName: string): Logger {
  return logger.child({ plugin: pluginName });
}

export default logger;

