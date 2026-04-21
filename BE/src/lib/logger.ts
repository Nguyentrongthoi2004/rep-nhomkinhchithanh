import { env } from "@/config/env";

type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function fmt(level: Level, msg: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `${ts} [${level.toUpperCase()}] ${msg}${metaStr}`;
}

function shouldLog(level: Level) {
  return order[level] >= order[env.LOG_LEVEL];
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog("debug")) console.debug(fmt("debug", msg, meta));
  },
  info(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog("info")) console.info(fmt("info", msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog("warn")) console.warn(fmt("warn", msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog("error")) console.error(fmt("error", msg, meta));
  },
};
