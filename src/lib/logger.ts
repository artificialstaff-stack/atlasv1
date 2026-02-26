/**
 * Atlas Structured Logger — Production-grade logging
 *
 * JSON-structured logs for observability.
 * Can be piped to any log aggregator (Datadog, Axiom, Betterstack).
 *
 * In development: pretty-prints to console.
 * In production: outputs structured JSON for machine parsing.
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const MIN_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? "info"];
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= MIN_LEVEL;
}

function formatEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    return JSON.stringify(entry);
  }
  // Dev: prettier output
  const { level, message, timestamp, service, ...meta } = entry;
  const metaStr = Object.keys(meta).length > 0
    ? ` ${JSON.stringify(meta)}`
    : "";
  return `[${timestamp}] ${level.toUpperCase().padEnd(5)} [${service}] ${message}${metaStr}`;
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "atlas-platform",
    ...meta,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
    case "fatal":
      console.error(formatted);
      break;
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    emit("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    emit("error", message, meta),
  fatal: (message: string, meta?: Record<string, unknown>) =>
    emit("fatal", message, meta),

  /** Create a child logger with preset context */
  child: (context: Record<string, unknown>) => ({
    debug: (msg: string, meta?: Record<string, unknown>) =>
      emit("debug", msg, { ...context, ...meta }),
    info: (msg: string, meta?: Record<string, unknown>) =>
      emit("info", msg, { ...context, ...meta }),
    warn: (msg: string, meta?: Record<string, unknown>) =>
      emit("warn", msg, { ...context, ...meta }),
    error: (msg: string, meta?: Record<string, unknown>) =>
      emit("error", msg, { ...context, ...meta }),
    fatal: (msg: string, meta?: Record<string, unknown>) =>
      emit("fatal", msg, { ...context, ...meta }),
  }),
};
