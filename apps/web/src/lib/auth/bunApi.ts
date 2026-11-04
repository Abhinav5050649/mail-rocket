import "server-only";

/** Base URL of the apps/api backend. Server-only - never exposed to the client. */
function getBunApiUrl(): string {
  const url = process.env.BUN_API_URL;
  if (!url) throw new Error("Missing required env var: BUN_API_URL");
  return url;
}

/**
 * Calls apps/api server-to-server. Used by the auth Route Handlers (which
 * forward the pasted or stored API key themselves) and by the catch-all
 * proxy (which adds the session key as an Authorization header). Errors are apps/api's own `{error}` JSON,
 * passed through untouched by the caller.
 */
export async function bunApiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${getBunApiUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
}
