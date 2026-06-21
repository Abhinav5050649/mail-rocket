import pino from "pino"
import { config } from "../../config";

/**
 * Shared application-wide pino logger instance.
 *
 * - `serializers.err` formats `Error`/`HTTPException`/Mongoose error objects
 *   passed under the `err` key into a proper stack trace instead of an
 *   opaque `[object Object]` - always log errors as `logger.error({ err }, ...)`.
 * - In `dev`, output goes through `pino-pretty` for human-readable console
 *   output; otherwise it's plain newline-delimited JSON, suited for log
 *   aggregators in production.
 */
export const logger = pino({
  level: config.logLevel || "info",
  serializers: {
    err: pino.stdSerializers.err,
  },
  transport: config.nodeEnv === "dev"
    ? { target: "pino-pretty" }  // readable in dev
    : undefined,                  // plain JSON in production
});
