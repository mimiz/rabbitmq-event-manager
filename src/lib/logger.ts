import { Writable } from 'stream';
import * as winston from 'winston';
import { EventManagerError } from './EventManagerError';

const { format } = winston;
const { combine, printf, metadata, timestamp, label, colorize, errors, json } = format;

export interface ICreateLoggerOptions {
  prefix?: string;
  level?: string;
  transportMode?: 'mute' | 'console';
}

const myFormat = printf(info => {
  info.stack = info.stack && info.stack !== '' ? `\n${info.stack}` : '';
  info.metadata = info.metadata && Object.keys(info.metadata).length > 0 ? ` - metadata: ${JSON.stringify(info.metadata)}` : '';

  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}${info.metadata}${info.stack}`;
});

function createFormat(prefix: string) {
  return combine(
    timestamp(),
    label({ label: prefix }),
    colorize(),
    metadata({
      fillExcept: ['message', 'label', 'timestamp', 'level', 'stack'],
    }),
    errors({ stack: true }),
    myFormat
  );
}
const jsonFormat = (prefix: string) => combine(timestamp(), label({ label: prefix }), errors({ stack: true }), json());
interface ILogger extends winston.Logger {
  [k: string]: any;
}
let currentLogger: ILogger | null = null;
export function createLogger({ prefix = '[RABBITMQ]', level = 'error', transportMode = 'console' }: ICreateLoggerOptions): void {
  if (currentLogger === null) {
    const transports: any[] = []; // winston interface are not that useful
    if (transportMode === 'mute') {
      transports.push(
        new winston.transports.Stream({
          stream: new Writable({
            write: () => {
              /* do nothing */
            },
          }),
        })
      );
    } else {
      // transports === 'console'
      transports.push(
        new winston.transports.Console({
          level,
          format: createFormat(prefix),
        })
      );
    }

    currentLogger = winston.createLogger({
      level,
      format: jsonFormat(prefix),
      transports,
    });
  }
}

export const LOGGER = new Proxy(({} as any) as ILogger, {
  get: (_, prop) => {
    if (currentLogger === null) {
      throw new EventManagerError('Logger has not been inititialized');
    } else {
      return currentLogger[prop.toString()];
    }
  },
});

export function setLogger(logger: ILogger | null) {
  currentLogger = logger;
}
