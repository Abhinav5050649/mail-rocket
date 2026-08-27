import pino from "pino"
import { config } from "../../config";

// NODE_ENV is "production" only in the Docker runtime image (Dockerfile);
// every other value (unset, "dev", "local" from example.env, ...) is
// treated as a dev-like environment and gets pretty console output.
const isDev = config.nodeEnv !== "production";
const level = config.logLevel || "info";

/**
 * Shared application-wide pino logger instance.
 *
 * - `serializers.err` formats `Error`/`HTTPException`/Mongoose error objects
 *   passed under the `err` key into a proper stack trace instead of an
 *   opaque `[object Object]` - always log errors as `logger.error({ err }, ...)`.
 * - Logs fan out to two targets: the console (pretty in dev, plain NDJSON
 *   in production for log aggregators) and rotating files under `logs/`,
 *   resolved relative to the process cwd - `bun/api/logs/` locally,
 *   `/app/logs` under Docker (see the `./logs` bind mount in
 *   docker-compose.yml, so files survive `docker compose down`). The
 *   directory is created automatically if missing.
 * - File rotation (`pino-roll`) caps disk usage for the bare single-instance
 *   EC2 deployment this targets (a small instance like t3.small with a
 *   20-30GB root volume shared with Postgres/Redis data and Docker images):
 *   a file rolls over at 10MB or after a day, whichever comes first, and
 *   only the 7 most recent rotated files are kept alongside the active one -
 *   roughly a week of history, ~80MB worst case.
 */
export const logger = pino({
  level,
  serializers: {
    err: pino.stdSerializers.err,
  },
  transport: {
    targets: [
      isDev
        ? { target: "pino-pretty", options: { destination: 1 }, level }
        : { target: "pino/file", options: { destination: 1 }, level }, // stdout, plain NDJSON
      {
        target: "pino-roll",
        options: {
          file: "logs/app",
          frequency: "daily",
          size: "10m",
          limit: { count: 7 },
          mkdir: true,
        },
        level,
      },
    ],
  },
});
