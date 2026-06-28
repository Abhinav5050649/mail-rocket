/**
 * @file Application entry point.
 * Bun executes this module directly; the default export below is picked up
 * by Bun's native server runtime (`bun run index.ts`), which calls `fetch`
 * for every incoming request and binds to `port`.
 */
import { Hono } from "hono";
import { config } from "./config";
import { appRoute, requestLogger, errorHandler, connectDB } from "./src";

// Verify the Postgres connection before accepting traffic so the first
// request doesn't race an unconnected client.
await connectDB();

const app = new Hono()

// Logs every request's method/path on the way in and out, with duration.
app.use('*', requestLogger);
// Centralized error handler: catches anything thrown by a route/controller
// and turns it into a logged, JSON HTTP response instead of Hono's default
// plain-text 500.
app.onError(errorHandler);

// Mounted at '/' (not '*') - mounting sub-routers at the wildcard path
// breaks Hono's router once more than one dynamic-segment route exists.
app.route('/', appRoute)

export default { port: config.port, fetch: app.fetch }
