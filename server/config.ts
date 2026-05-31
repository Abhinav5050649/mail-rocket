const required = (key: string): string => {
  const value = Bun.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const config = {
  port:        Number(Bun.env.PORT) || 3000,
  nodeEnv:      Bun.env.NODE_ENV || "dev",
  databaseUrl: required("DB_URL"),   // throws if missing
  jwtSecret:   required("JWT_SECRET"),
  logLevel: Bun.env.LOG_LEVEL || "info"
};