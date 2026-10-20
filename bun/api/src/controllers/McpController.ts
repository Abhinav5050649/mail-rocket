import type { Context } from "hono";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { logger } from "../libs";
import { createMcpServer } from "../mcp/server";

/**
 * HTTP layer for the MCP (Model Context Protocol) endpoint. Hands the raw
 * request to the SDK's Streamable HTTP transport, which speaks JSON-RPC and
 * dispatches to the tools in `src/mcp/tools.ts`. Authentication already
 * happened in `authenticate`, so an MCP client uses an ordinary API key.
 */
export class McpController {

    /**
     * ALL /mcp
     * Serves one MCP request statelessly: a fresh server and transport per
     * request, no session id, and plain JSON responses instead of an SSE
     * stream. Nothing is kept between requests, so it works unchanged behind
     * any number of API processes.
     *
     * @param c - Hono request context; `principal` is set by `authenticate`.
     * @returns The transport's JSON-RPC response.
     */
    handle = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.handle.name}`);

        const principal = c.get('principal');

        logger.debug({ keyId: principal.keyId, method: c.req.method }, `Request:`);

        const server = createMcpServer(principal);
        const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });

        try {
            await server.connect(transport);
            const response = await transport.handleRequest(c.req.raw);

            logger.debug({ status: response.status }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.handle.name}`);

            return response;
        } finally {
            // JSON mode has fully built the response by now, so the per-request server can go.
            await server.close();
        }
    }
}
