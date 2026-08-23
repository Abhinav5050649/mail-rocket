import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { config } from "./config";
import { appRoute, requestLogger, errorHandler, jsonOnly, notFound, connectDB, startCampaignWorkers } from "./src";

await connectDB();
startCampaignWorkers();

const app = new Hono();

app.use('*', requestLogger);
app.use('*', jsonOnly);
app.notFound(notFound);
app.onError(errorHandler);
app.route('/', appRoute);

serve({ fetch: app.fetch, port: config.port }, () => {
    console.log(`Server running on port ${config.port}`);
});
