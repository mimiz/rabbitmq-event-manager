import * as logform from "logform";
import { Writable } from "stream";
import * as tripleBeam from "triple-beam";
import * as winston from "winston";

const { format } = winston;
const {
  combine,
  printf,
  metadata,
  timestamp,
  label,
  colorize,
  prettyPrint
} = format;

export interface ICreateLoggerOptions {
  prefix: string;
  level: string;
  transportMode: "mute" | "console" | string;
}

/**
 * Add error to info regarding the parameters
 */
const errorHunter = logform.format(info => {
  if (info.error) {
    return info;
  }

  const splat = info[tripleBeam.SPLAT] || [];
  info.error = splat.find((obj: any) => obj instanceof Error);
  if (!info.error && splat.length === 1) {
    const obj = splat[0];
    const keyIsError = Object.keys(obj).find(k => {
      return obj[k] instanceof Error;
    });
    if (keyIsError) {
      info.error = obj[keyIsError];
    }
  }
  return info;
});

const errorPrinter = logform.format(info => {
  if (!info.error) {
    return info;
  }

  // Handle case where Error has no stack.
  const errorMsg = info.error.stack || info.error.toString();
  info.message += `\n${errorMsg.padStart()}`;

  return info;
});

const myFormat = printf(info => {
  let meta = "";
  if (info.metadata && Object.keys(info.metadata).length > 0) {
    // remove error instances
    const filtered = Object.entries(info.metadata).filter(
      ([k, m]) => !(m instanceof Error)
    );
    if (filtered.length > 0) {
      meta = filtered.reduce((str, [k, v], index) => {
        if (!(info.error && k === "stack")) {
          str += `\t - ${k} : ${JSON.stringify(v)}\n`;
        }
        if (index === 0 && str !== "") {
          str = `\nContext : \n${str}`;
        }
        return str;
      }, "");
    }
  }

  const out = `${info.timestamp} [${info.label}] ${info.level}: ${
    info.message
  }`;

  return `${out}${meta}`;
});

function createFormat(prefix: string) {
  return combine(
    errorHunter(),
    timestamp(),
    label({ label: prefix }),
    colorize(),
    metadata({
      fillExcept: ["message", "label", "timestamp", "level", "error"]
    }),
    errorPrinter(),
    myFormat
  );
}
export function createLogger({
  prefix,
  level = "error",
  transportMode = "console"
}: ICreateLoggerOptions): winston.Logger {
  const transports: any[] = []; // winston interface are not that useful
  if (transportMode === "mute") {
    transports.push(
      new winston.transports.Stream({
        stream: new Writable({
          write: () => {
            /* do nothing */
          }
        })
      })
    );
  } else {
    // transports === 'console'
    transports.push(
      new winston.transports.Console({
        level,
        format: createFormat(prefix)
      })
    );
  }

  const logger = winston.createLogger({
    level,
    format: winston.format.json(),
    transports
  });
  return logger;
}

export const LOGGER = createLogger({
  prefix: process.env.RABBITMQ_EVENT_MANAGER_PREFIX
    ? process.env.RABBITMQ_EVENT_MANAGER_PREFIX
    : "RABBITMQ_EVENT_MANAGER",
  level: process.env.RABBITMQ_EVENT_MANAGER_LOG_LEVEL
    ? process.env.RABBITMQ_EVENT_MANAGER_LOG_LEVEL
    : "error",
  transportMode: process.env.RABBITMQ_EVENT_MANAGER_TRANSPORT_MODE
    ? process.env.RABBITMQ_EVENT_MANAGER_TRANSPORT_MODE
    : "console"
});
