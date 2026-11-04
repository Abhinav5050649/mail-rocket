import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { Identity, IdentityInput, IdentityListArgs } from "./model";

export const identitiesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getIdentities: builder.query<Identity[], IdentityListArgs>({
      query: (args) => ({
        url: `/identities`,
        params: args,
      }),
      providesTags: (result) => listTags("Identity", result),
    }),
    getIdentity: builder.query<Identity, { identityId: string }>({
      query: ({ identityId }) => `/identities/${identityId}`,
      providesTags: (_r, _e, { identityId }) => itemTag("Identity", identityId),
    }),
    createIdentity: builder.mutation<Identity, IdentityInput>({
      query: (body) => ({
        url: `/identities`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Identity", id: "LIST" }],
    }),
    updateIdentity: builder.mutation<
      Identity,
      { identityId: string } & Partial<IdentityInput>
    >({
      query: ({ identityId, ...body }) => ({
        url: `/identities/${identityId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { identityId }) => itemTag("Identity", identityId),
    }),
    deleteIdentity: builder.mutation<void, { identityId: string }>({
      query: ({ identityId }) => ({
        url: `/identities/${identityId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { identityId }) => [
        ...itemTag("Identity", identityId),
        { type: "Identity", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetIdentitiesQuery,
  useGetIdentityQuery,
  useCreateIdentityMutation,
  useUpdateIdentityMutation,
  useDeleteIdentityMutation,
} = identitiesApi;
