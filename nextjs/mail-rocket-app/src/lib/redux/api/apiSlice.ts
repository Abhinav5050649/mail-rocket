import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({ baseUrl: "/api", credentials: "include" });

/**
 * `proxy.ts` only checks that the session cookie is *present* before letting
 * a page render (it can't verify the JWT from the edge) - an expired,
 * forged, or stale cookie still gets past it. This wrapper is the actual
 * enforcement: any 401 from the BFF proxy (meaning bun/api rejected the
 * token) bounces the client to /login, so no page stays usable without a
 * token bun/api actually accepts.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // A hard reload (not router.push) so Redux/RTK Query state tied to the
    // rejected token doesn't survive the navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${next}`;
  }
  return result;
};

/**
 * Every resource's `injectEndpoints` module builds on this base. `baseUrl`
 * points at this app's own `/api` Route Handlers (the BFF proxy), never at
 * bun/api directly, so the httpOnly session cookie rides along automatically
 * via `credentials: "include"` and the JWT never reaches client JS.
 */
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Session",
    "Organization",
    "Membership",
    "User",
    "Address",
    "ContactDetails",
    "Identity",
    "Campaign",
    "Template",
    "Group",
    "Recipient",
  ],
  endpoints: () => ({}),
});
