import { Hono } from "hono";
import { appRoute } from "./routes";
import { requestLogger } from "./middleware";
import { config } from "./config";


const app = new Hono()

app.use('*', requestLogger);

app.route('*', appRoute)

export default { port: config.port, fetch: app.fetch }