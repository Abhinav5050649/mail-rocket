/**
 * Reads a required environment variable.
 *
 * @param key - Name of the environment variable to read.
 * @returns The variable's value.
 * @throws {Error} If the variable is not set.
 */
const required = (key: string): string => {
  const value = Bun.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

/**
 * Centralized application configuration, sourced from environment variables.
 * `databaseUrl` and `jwtSecret` are mandatory and throw at import time if missing,
 * so a misconfigured deployment fails fast on startup instead of at first use.
 */
export const config = {
  /** HTTP port the Bun server listens on. Defaults to 3000. */
  port:        Number(Bun.env.PORT) || 3000,
  /** Current runtime environment (e.g. "dev", "production"). Defaults to "dev". */
  nodeEnv:      Bun.env.NODE_ENV || "dev",
  /** MongoDB connection string. Required. */
  databaseUrl: required("DB_URL"),   // throws if missing
  /** Secret used to sign/verify JWTs. Required. */
  jwtSecret:   required("JWT_SECRET"),
  /** Minimum pino log level to emit. Defaults to "info". */
  logLevel: Bun.env.LOG_LEVEL || "info"
};
