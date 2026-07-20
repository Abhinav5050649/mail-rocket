import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { handle } from "hono/aws-lambda";
import { config } from "./config";
import { appRoute, requestLogger, errorHandler, connectDB } from "./src";

await connectDB();

const app = new Hono();

app.use('*', requestLogger);
app.onError(errorHandler);
app.route('/', appRoute);

/**
 * AWS Lambda entrypoint. `hono/aws-lambda`'s adapter translates API
 * Gateway/Function URL events into fetch Requests/Responses, so the
 * deployed function's handler is set to `index.handler`.
 */
export const handler = handle(app);

/**
 * Outside a Lambda runtime (local dev, `npm start`), run a normal listening
 * server instead. AWS sets AWS_LAMBDA_FUNCTION_NAME automatically, so this
 * only fires when the module isn't actually running inside Lambda.
 */
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    serve({ fetch: app.fetch, port: config.port }, () => {
        console.log(`Server running on port ${config.port}`);
    });
}
