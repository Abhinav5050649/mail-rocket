import { describe, it, expect, mock, beforeEach } from "bun:test";
import { chain, createMockDb } from "../helpers/mockDb";

/**
 * Drives the `/mcp` endpoint end to end with the MCP SDK's own client: real
 * JSON-RPC over the Streamable HTTP transport, through `authenticate`, into
 * the tools - with only the Drizzle `db` replaced. `fetch` is routed into the
 * in-process Hono app instead of the network.
 */
const mockDb = createMockDb();
mock.module("../../src/libs/db", () => ({ db: mockDb, connectDB: async () => {} }));

const { appRoute, apiKeyTable, campaignTable, claimsForPreset, errorHandler } = await import("../../src");
const { Hono } = await import("hono");
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");

const app = new Hono().onError(errorHandler).route("/", appRoute);

/** Rows each table's selects resolve to; the `api_key` entry is the calling key. */
let rowsByTable = new Map<unknown, unknown[]>();

/** Makes every `db.select().from(table)` resolve to that table's rows in `rowsByTable`. */
const routeSelectsByTable = () => {
    mockDb.select.mockImplementation(() => {
        const node = chain([]);
        node.from = mock((table: unknown) => chain(rowsByTable.get(table) ?? []));
        return node;
    });
};

/** A stored key row with `claims`, as `authenticate` and `get_me` read it. */
const keyRow = (claims: readonly unknown[]) => ({
    id: "key-1", name: "agent", claims: [...claims], prefix: "mr_agent", key_hash: "x",
    expires_at: null, description: null, created_at: new Date(), updated_at: null,
});

/** Connects an MCP client to the in-process app, authenticating as a key holding `claims`. */
const connectAs = async (claims: readonly unknown[]) => {
    rowsByTable = new Map([[apiKeyTable, [keyRow(claims)]]]);
    const transport = new StreamableHTTPClientTransport(new URL("http://mail-rocket.test/mcp"), {
        fetch: async (url, init) => app.request(url.toString(), init),
        requestInit: { headers: { authorization: "Bearer mr_agent" } },
    });
    const client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
    return client;
};

/** The names of every tool the server lists to this client. */
const toolNames = async (client: InstanceType<typeof Client>) => (await client.listTools()).tools.map((tool) => tool.name);

/** The text of a tool result's first content block. */
const textOf = (result: Awaited<ReturnType<InstanceType<typeof Client>["callTool"]>>) =>
    (result.content as { type: string; text: string }[])[0]!.text;

describe("/mcp", () => {
    beforeEach(() => {
        mockDb.select.mockReset();
        routeSelectsByTable();
    });

    it("401s without an API key", async () => {
        const res = await app.request("/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        expect(res.status).toBe(401);
    });

    it("lists only read tools to a viewer key", async () => {
        const names = await toolNames(await connectAs(claimsForPreset.viewer));

        expect(names).toContain("get_me");
        expect(names).toContain("list_campaigns");
        expect(names).toContain("get_identity");
        expect(names).not.toContain("create_campaign");
        expect(names).not.toContain("delete_key");
    });

    it("lists campaign writes but not identity writes or key management to an editor key", async () => {
        const names = await toolNames(await connectAs(claimsForPreset.editor));

        expect(names).toContain("create_campaign");
        expect(names).toContain("delete_recipient");
        expect(names).toContain("list_identities");
        expect(names).not.toContain("create_identity");
        expect(names).not.toContain("update_organization");
        expect(names).not.toContain("create_key");
    });

    it("lists every tool to an admin key", async () => {
        const names = await toolNames(await connectAs(claimsForPreset.admin));

        for (const name of ["create_identity", "update_organization", "create_address", "create_key", "delete_key"]) {
            expect(names).toContain(name);
        }
    });

    it("returns the calling key from get_me", async () => {
        const client = await connectAs(claimsForPreset.viewer);
        const result = await client.callTool({ name: "get_me", arguments: {} });

        expect(result.isError).toBeFalsy();
        expect(JSON.parse(textOf(result))).toMatchObject({ id: "key-1", preset: "viewer" });
    });

    it("reads data through the services", async () => {
        const client = await connectAs(claimsForPreset.viewer);
        rowsByTable.set(campaignTable, [{ id: "campaign-1", name: "Launch" }]);

        const result = await client.callTool({ name: "get_campaign", arguments: { campaign_id: "campaign-1" } });

        expect(JSON.parse(textOf(result))).toEqual({ id: "campaign-1", name: "Launch" });
    });

    it("reports a missing row as a tool error", async () => {
        const client = await connectAs(claimsForPreset.viewer);
        const result = await client.callTool({ name: "get_campaign", arguments: { campaign_id: "missing" } });

        expect(result.isError).toBe(true);
        expect(textOf(result)).toBe("Campaign not found");
    });

    it("refuses to let a key revoke itself", async () => {
        const client = await connectAs(claimsForPreset.admin);
        const result = await client.callTool({ name: "delete_key", arguments: { key_id: "key-1" } });

        expect(result.isError).toBe(true);
        expect(textOf(result)).toContain("revoke the key you are using");
        expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("rejects create_key with both a preset and claims", async () => {
        const client = await connectAs(claimsForPreset.admin);
        const result = await client.callTool({
            name: "create_key",
            arguments: { name: "ci", preset: "viewer", claims: [{ action: "read", subject: "Campaign" }] },
        });

        expect(result.isError).toBe(true);
        expect(textOf(result)).toContain("exactly one of preset or claims");
    });

    it("refuses a tool the key isn't listed for", async () => {
        const client = await connectAs(claimsForPreset.viewer);
        const result = await client.callTool({ name: "delete_campaign", arguments: { campaign_id: "campaign-1" } });

        expect(result.isError).toBe(true);
        expect(mockDb.delete).not.toHaveBeenCalled();
    });
});
