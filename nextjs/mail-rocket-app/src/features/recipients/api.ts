import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { Recipient, RecipientInput } from "./model";

/**
 * Every recipient list (all, a campaign's audience, a group's members)
 * carries the `LIST` sentinel. Group membership is many-to-many and a
 * campaign's audience includes its groups' members, so one change can move
 * a recipient in or out of several lists at once: every write invalidates
 * `LIST` rather than guessing which scoped lists it touched.
 */
const ALL_LISTS = { type: "Recipient" as const, id: "LIST" };

/** Reachable top-level, as a campaign's audience, and as a group's members. */
export const recipientsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRecipients: builder.query<Recipient[], PageArgs>({
      query: (args) => ({ url: `/recipients`, params: args }),
      providesTags: (result) => listTags("Recipient", result),
    }),
    /** A campaign's audience: recipients linked to it directly plus members of its linked groups, each once. */
    getCampaignRecipients: builder.query<Recipient[], { campaignId: string } & PageArgs>({
      query: ({ campaignId, ...args }) => ({ url: `/campaigns/${campaignId}/recipients`, params: args }),
      providesTags: (result) => listTags("Recipient", result),
    }),
    /** A group's members (no campaign needed). */
    getGroupRecipients: builder.query<Recipient[], { groupId: string } & PageArgs>({
      query: ({ groupId, ...args }) => ({ url: `/groups/${groupId}/recipients`, params: args }),
      providesTags: (result) => listTags("Recipient", result),
    }),
    getRecipient: builder.query<Recipient, { recipientId: string }>({
      query: ({ recipientId }) => `/recipients/${recipientId}`,
      providesTags: (_r, _e, { recipientId }) => itemTag("Recipient", recipientId),
    }),
    createRecipient: builder.mutation<Recipient, RecipientInput>({
      query: (body) => ({ url: `/recipients`, method: "POST", body }),
      invalidatesTags: [ALL_LISTS],
    }),
    updateRecipient: builder.mutation<Recipient, { recipientId: string } & Partial<RecipientInput>>({
      query: ({ recipientId, ...body }) => ({ url: `/recipients/${recipientId}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { recipientId }) => [...itemTag("Recipient", recipientId), ALL_LISTS],
    }),
    deleteRecipient: builder.mutation<void, { recipientId: string }>({
      query: ({ recipientId }) => ({ url: `/recipients/${recipientId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { recipientId }) => [...itemTag("Recipient", recipientId), ALL_LISTS],
    }),
    /** Adds an existing recipient to a group; they keep their other groups. */
    addRecipientToGroup: builder.mutation<Recipient, { groupId: string; recipientId: string }>({
      query: ({ groupId, recipientId }) => ({ url: `/groups/${groupId}/recipients`, method: "POST", body: { recipient_id: recipientId } }),
      invalidatesTags: (_r, _e, { recipientId }) => [...itemTag("Recipient", recipientId), ALL_LISTS],
    }),
    /** Removes a recipient from one group; the recipient is kept. */
    removeRecipientFromGroup: builder.mutation<Recipient, { groupId: string; recipientId: string }>({
      query: ({ groupId, recipientId }) => ({ url: `/groups/${groupId}/recipients/${recipientId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { recipientId }) => [...itemTag("Recipient", recipientId), ALL_LISTS],
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
  useAddRecipientToGroupMutation,
  useRemoveRecipientFromGroupMutation,
} = recipientsApi;
