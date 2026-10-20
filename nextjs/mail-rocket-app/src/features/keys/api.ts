import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { ApiKey, ApiKeyCreated, ApiKeySummary, KeyCreateInput, KeyUpdateInput } from "./model";

/**
 * API keys - the only principal. A key without the `create Key` claim gets
 * `ApiKeySummary` rows from the list; the plaintext secret only ever comes
 * back once, from `createKey`.
 */
export const keysApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getKeys: builder.query<(ApiKey | ApiKeySummary)[], PageArgs>({
      query: (args) => ({ url: "/keys", params: args }),
      providesTags: (result) => listTags("Key", result),
    }),
    createKey: builder.mutation<ApiKeyCreated, KeyCreateInput>({
      query: (body) => ({ url: "/keys", method: "POST", body }),
      invalidatesTags: [{ type: "Key", id: "LIST" }],
    }),
    updateKey: builder.mutation<ApiKey, { keyId: string } & KeyUpdateInput>({
      query: ({ keyId, ...body }) => ({ url: `/keys/${keyId}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { keyId }) => itemTag("Key", keyId),
    }),
    revokeKey: builder.mutation<void, { keyId: string }>({
      query: ({ keyId }) => ({ url: `/keys/${keyId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { keyId }) => [...itemTag("Key", keyId), { type: "Key", id: "LIST" }],
    }),
  }),
});

export const { useGetKeysQuery, useCreateKeyMutation, useUpdateKeyMutation, useRevokeKeyMutation } = keysApi;
