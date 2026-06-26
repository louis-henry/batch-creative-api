/** Minimal structured logger the application layer depends on (pino satisfies it). */
export interface Logger {
  warn(obj: unknown, msg: string): void;
  error(obj: unknown, msg: string): void;
}
