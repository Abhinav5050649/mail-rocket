import { Hono } from "hono";
import { OverviewController } from "../controllers";
import { OverviewService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const overviewService = new OverviewService();
const overviewController = new OverviewController(overviewService);

/**
 * Routes for `/overview`: the dashboard's aggregate counts.
 *
 * - GET / - fetch the overview. No `requireAbility`: any valid key may call
 *   it, and the controller blanks out each section the key can't `read`.
 */
export const overviewRoute = new Hono()
    .get('/', overviewController.get)
