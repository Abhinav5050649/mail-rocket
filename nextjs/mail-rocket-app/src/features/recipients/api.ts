import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { Recipient, RecipientInput } from "./model";

function scopeTags(row: Recipient | undefined) {
  return [
    ...(row?.campaign_id ? [{ type: "Recipient" as const, id: `CAMPAIGN_${row.campaign_id}` }] : []),
    ...(row?.group_id ? [{ type: "Recipient" as const, id: `GROUP_${row.group_id}` }] : []),
  ];
}

/** Reachable top-level, campaign-nested, and campaign+group-nested - see templates/api.ts for the scoped-tag rationale. */
export const recipientsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRecipients: builder.query<Recipient[], PageArgs>({
      query: (args) => ({
        url: `/recipients`,
        params: args,
      }),
      providesTags: (result) => listTags("Recipient", result),
    }),
    getCampaignRecipients: builder.query<Recipient[], { campaignId: string } & PageArgs>({
      query: ({ campaignId, ...args }) => ({
        url: `/campaigns/${campaignId}/recipients`,
        params: args,
      }),
      providesTags: (result, _e, { campaignId }) => listTags("Recipient", result, [`CAMPAIGN_${campaignId}`]),
    }),
    getGroupRecipients: builder.query<
      Recipient[],
      { campaignId: string; groupId: string } & PageArgs
    >({
      query: ({ campaignId, groupId, ...args }) => ({
        url: `/campaigns/${campaignId}/groups/${groupId}/recipients`,
        params: args,
      }),
      providesTags: (result, _e, { campaignId, groupId }) =>
        listTags("Recipient", result, [`CAMPAIGN_${campaignId}`, `GROUP_${groupId}`]),
    }),
    getRecipient: builder.query<Recipient, { recipientId: string }>({
      query: ({ recipientId }) => `/recipients/${recipientId}`,
      providesTags: (_r, _e, { recipientId }) => itemTag("Recipient", recipientId),
    }),
    createRecipient: builder.mutation<Recipient, RecipientInput>({
      query: (body) => ({
        url: `/recipients`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result) => [{ type: "Recipient", id: "LIST" }, ...scopeTags(result)],
    }),
    updateRecipient: builder.mutation<
      Recipient,
      { recipientId: string } & Partial<RecipientInput>
    >({
      query: ({ recipientId, ...body }) => ({
        url: `/recipients/${recipientId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, _e, { recipientId }) => [...itemTag("Recipient", recipientId), ...scopeTags(result)],
    }),
    deleteRecipient: builder.mutation<
      void,
      { recipientId: string; campaignId?: string; groupId?: string }
    >({
      query: ({ recipientId }) => ({
        url: `/recipients/${recipientId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { recipientId, campaignId, groupId }) => [
        ...itemTag("Recipient", recipientId),
        { type: "Recipient", id: "LIST" },
        ...(campaignId ? [{ type: "Recipient" as const, id: `CAMPAIGN_${campaignId}` }] : []),
        ...(groupId ? [{ type: "Recipient" as const, id: `GROUP_${groupId}` }] : []),
      ],
    }),
  }),
});

export const {
  useGetRecipientsQuery,
  useGetCampaignRecipientsQuery,
  useGetGroupRecipientsQuery,
  useGetRecipientQuery,
  useCreateRecipientMutation,
  useUpdateRecipientMutation,
  useDeleteRecipientMutation,
} = recipientsApi;
