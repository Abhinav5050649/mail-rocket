import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { config } from "./config";
import { appRoute, requestLogger, errorHandler, connectDB } from "./src";

await connectDB();

const app = new Hono();

app.use('*', requestLogger);
app.onError(errorHandler);
app.route('/', appRoute);

serve({ fetch: app.fetch, port: config.port }, () => {
    console.log(`Server running on port ${config.port}`);
});
