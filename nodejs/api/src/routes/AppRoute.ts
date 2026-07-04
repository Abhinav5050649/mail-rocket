import { Hono } from "hono";
import { userRoute } from "./UserRoute";

/**
 * Root route table. Mounts every feature's sub-router under its resource
 * prefix; `index.ts` mounts this whole thing at `/`.
 */
export const appRoute = new Hono()
    .route('/users', userRoute);
