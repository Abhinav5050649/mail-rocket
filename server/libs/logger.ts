import pino from "pino"
import { config } from "../config";

export const logger = pino({
  level: config.logLevel || "info",
  transport: config.nodeEnv === "dev"
    ? { target: "pino-pretty" }  // readable in dev
    : undefined,                  // plain JSON in production
});