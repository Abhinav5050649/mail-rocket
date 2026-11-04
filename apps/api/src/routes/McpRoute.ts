import { Hono } from "hono";
import { McpController } from "../controllers";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller is safe to reuse across requests.
const mcpController = new McpController();

/**
 * Route for `/mcp`: the Model Context Protocol endpoint (Streamable HTTP,
 * stateless). No `requireAbility` here - each tool carries its own CASL
 * claim, and a key only sees the tools it holds claims for.
 *
 * - ALL / - one JSON-RPC exchange (initialize, tools/list, tools/call, ...).
 */
export const mcpRoute = new Hono()
    .all('/', mcpController.handle)
