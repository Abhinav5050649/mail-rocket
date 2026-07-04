/**
 * Reads a required environment variable.
 *
 * @param key - Name of the environment variable to read.
 * @returns The variable's value.
 * @throws {Error} If the variable is not set.
 */
const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const config = {
  port:        Number(process.env.PORT) || 3000,
  nodeEnv:     process.env.NODE_ENV || "dev",
  databaseUrl: required("DB_URL"),
  jwtSecret:   required("JWT_SECRET"),
  logLevel:    process.env.LOG_LEVEL || "info"
};
