type LogLevel = "info" | "warn" | "error" | "debug";

const isDebugEnabled = (): boolean =>
  process.env.COLLAB_LOG_LEVEL === "debug";

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    log("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) =>
    log("debug", message, meta)
};

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (level === "debug" && !isDebugEnabled()) {
    return;
  }
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  const line = `[collab] ${level.toUpperCase()} ${message}${payload}`;
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
