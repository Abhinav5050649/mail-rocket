import { Hono } from "hono";
import { userRoute } from "./UserRoute";
import { projectRoute } from "./ProjectRoute";
import { authRoute } from "./AuthRoute";

/**
 * Root route table. Mounts every feature's sub-router under its resource
 * prefix; `index.ts` mounts this whole thing at `/`.
 */
export const appRoute = new Hono()
    .route('/users', userRoute)
    .route('/projects', projectRoute)
    .route('/auth', authRoute);
