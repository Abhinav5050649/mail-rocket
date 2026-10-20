import { apiSlice } from "@/lib/redux/api/apiSlice";
import type { ApiKey } from "@/types/resources";
import type { SigninRequest } from "./model";

/**
 * These hit this app's own dedicated auth Route Handlers (src/app/api/auth/*),
 * not bun/api directly - they're the only endpoints that set/clear the
 * session cookie, so they can't be served by the generic catch-all proxy.
 * No slice.ts/selectors.ts here: auth has no list view and no dialog UI
 * state, just these effects plus the login form's own local react-hook-form state.
 */
export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signin: builder.mutation<{ key: ApiKey }, SigninRequest>({
      query: (body) => ({ url: "/auth/signin", method: "POST", body }),
      invalidatesTags: ["Session"],
    }),
    signout: builder.mutation<void, void>({
      query: () => ({ url: "/auth/signout", method: "POST" }),
      invalidatesTags: ["Session"],
    }),
  }),
});

export const { useSigninMutation, useSignoutMutation } = authApi;
