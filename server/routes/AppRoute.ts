import { Hono } from "hono";
import { userRoute } from "./UserRoute";

export const appRoute = new Hono()
    .route('/users', userRoute);
