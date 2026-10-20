import { apiSlice } from "@/lib/redux/api/apiSlice";
import type { Me } from "./model";

/**
 * `getMe` is the single call that backs both the shell and claim-gating: it
 * returns the signed-in API key with its claims, which `useAbility` turns
 * into the same CASL ability bun/api enforces - no second lookup needed.
 */
export const sessionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<Me, void>({
      query: () => "/auth/me",
      providesTags: ["Session"],
    }),
  }),
});

export const { useGetMeQuery } = sessionApi;
