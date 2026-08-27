import "dotenv/config";
import { Hono } from "hono";
import { config } from "./config";
import { appRoute, requestLogger, errorHandler, jsonOnly, notFound, connectDB, startCampaignWorkers, startIdentityVerificationWorker } from "./src";

await connectDB();
startCampaignWorkers();
startIdentityVerificationWorker();

const app = new Hono();

app.use('*', requestLogger);
app.use('*', jsonOnly);
app.notFound(notFound);
app.onError(errorHandler);
app.route('/', appRoute);

const server = Bun.serve({ fetch: app.fetch, port: config.port });
console.log(`Server running on port ${server.port}`);
