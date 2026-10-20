import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../libs";
import type { Principal } from "../middleware/authenticate";
import { isExpectedToolError, MCP_TOOLS, type McpToolDefinition } from "./tools";

/** Wraps a value as a tool result the AI client reads as JSON text. */
const textResult = (data: unknown, isError = false): CallToolResult => ({
    content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
    ...(isError ? { isError: true } : {}),
});

/**
 * Runs one tool call with the same logging and error rules as a controller:
 * expected failures (not found, self-guards, business-rule `ValidationError`s)
 * come back to the client as tool errors with their message; anything else is
 * logged with its stack and reported generically, so internals never leak.
 *
 * @param tool - The tool being called.
 * @param args - Arguments the SDK already validated against `tool.inputSchema`.
 * @param principal - The authenticated key making the call.
 */
async function runTool(tool: McpToolDefinition, args: Record<string, unknown>, principal: Principal): Promise<CallToolResult> {
    logger.info(`Start tool: mcp.${tool.name}`);
    logger.debug({ keyId: principal.keyId, args }, `Request:`);

    // Re-checked at call time even though unlisted tools can't be called, so the claim gate never depends on registration alone.
    if (tool.claim && !principal.ability.can(tool.claim.action, tool.claim.subject)) {
        return textResult(`Forbidden: key cannot ${tool.claim.action} ${tool.claim.subject}`, true);
    }

    try {
        const data = await tool.handler(args, principal);

        logger.info(`End tool: mcp.${tool.name}`);

        return textResult(data);
    } catch (error) {
        if (isExpectedToolError(error)) {
            logger.warn({ err: error, tool: tool.name }, `Handled tool error: ${error.message}`);
            return textResult(error.message, true);
        }

        logger.error({ err: error, tool: tool.name }, `Exception in mcp.${tool.name}`);
        return textResult("Internal error", true);
    }
}

/**
 * Builds an MCP server for one authenticated key. Only the tools whose CASL
 * claim the key holds are registered, so `tools/list` shows a client exactly
 * what it may do - the same boundary `requireAbility` enforces on REST.
 * Built per request: the endpoint is stateless, and a key's claims can change
 * between requests.
 *
 * @param principal - The authenticated key (set by `authenticate`).
 * @returns An `McpServer` ready to connect to a transport.
 */
export function createMcpServer(principal: Principal): McpServer {
    const server = new McpServer(
        { name: "mail-rocket", version: "1.0.0" },
        {
            instructions:
                "Tools for a self-hosted Mail Rocket instance: email campaigns sent through AWS SES. " +
                "A campaign sends its most recently updated template to its recipients from an active email identity; " +
                "setting start_time schedules the send. Subjects and templates may use {{variable}} placeholders such as " +
                "{{recipient_first_name}} and {{organization_name}}. Only the tools this API key's claims allow are listed - " +
                "call get_me to see the claims.",
        },
    );

    for (const tool of MCP_TOOLS) {
        if (tool.claim && !principal.ability.can(tool.claim.action, tool.claim.subject)) continue;

        server.registerTool(
            tool.name,
            { title: tool.title, description: tool.description, inputSchema: tool.inputSchema, annotations: tool.annotations },
            (args: Record<string, unknown>) => runTool(tool, args, principal),
        );
    }

    return server;
}
