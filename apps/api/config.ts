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
  logLevel:    process.env.LOG_LEVEL || "info",
  redisUrl:    required("REDIS_URL"),
  awsRegion:   required("AWS_REGION"),
  // Emails/second the campaign-send-chunk worker is allowed to fire at SES -
  // tune to the account's actual SES send-rate quota (see the SES console).
  sesSendRatePerSecond: Number(process.env.SES_SEND_RATE_PER_SECOND) || 14,
  // Public base URL of this API (e.g. https://api.example.com). When set,
  // sent emails get an open-tracking pixel and click-tracking links pointing
  // here; when unset, emails go out untouched and nothing is tracked.
  publicApiUrl: process.env.PUBLIC_API_URL || "",
  // Signs click-tracking links so `/track/click` can't be used as an open
  // redirect. Only needed (and then required) when tracking is on.
  trackingSecret: process.env.PUBLIC_API_URL ? required("TRACKING_SECRET") : "",
};
