import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { GroupMembersRemoveResult, Subscriber, SubscriberBulkDeleteResult, SubscriberImportInput, SubscriberImportResult, SubscriberInput } from "./model";

/**
 * Every subscriber list (all, a campaign's audience, a group's members)
 * carries the `LIST` sentinel. Group membership is many-to-many and a
 * campaign's audience includes its groups' members, so one change can move
 * a subscriber in or out of several lists at once: every write invalidates
 * `LIST` rather than guessing which scoped lists it touched.
 */
const ALL_LISTS = { type: "Subscriber" as const, id: "LIST" };

/** Every group list: a membership change moves groups' `subscriber_count`. */
const GROUP_COUNTS = { type: "Group" as const, id: "LIST" };

/** Reachable top-level, as a campaign's audience, and as a group's members. */
export const subscribersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSubscribers: builder.query<Subscriber[], PageArgs>({
      query: (args) => ({ url: `/subscribers`, params: args }),
      providesTags: (result) => listTags("Subscriber", result),
    }),
    /** A campaign's audience: its individually picked subscribers plus members of its groups, each once. Tagged `CAMPAIGN_<id>` so saving the campaign refreshes it. */
    getCampaignSubscribers: builder.query<Subscriber[], { campaignId: string } & PageArgs>({
      query: ({ campaignId, ...args }) => ({ url: `/campaigns/${campaignId}/subscribers`, params: args }),
      providesTags: (result, _e, { campaignId }) => listTags("Subscriber", result, [`CAMPAIGN_${campaignId}`]),
    }),
    /** A group's members (no campaign needed). */
    getGroupSubscribers: builder.query<Subscriber[], { groupId: string } & PageArgs>({
      query: ({ groupId, ...args }) => ({ url: `/groups/${groupId}/subscribers`, params: args }),
      providesTags: (result) => listTags("Subscriber", result),
    }),
    getSubscriber: builder.query<Subscriber, { subscriberId: string }>({
      query: ({ subscriberId }) => `/subscribers/${subscriberId}`,
      providesTags: (_r, _e, { subscriberId }) => itemTag("Subscriber", subscriberId),
    }),
    createSubscriber: builder.mutation<Subscriber, SubscriberInput>({
      query: (body) => ({ url: `/subscribers`, method: "POST", body }),
      invalidatesTags: [ALL_LISTS, GROUP_COUNTS],
    }),
    /** Creates many subscribers (reusing ones whose email already exists) and adds them all to the given groups. */
    importSubscribers: builder.mutation<SubscriberImportResult, SubscriberImportInput>({
      query: (body) => ({ url: `/subscribers/import`, method: "POST", body }),
      // Existing subscribers can gain groups too, so every subscriber query (lists and single rows) and group count may have moved.
      invalidatesTags: ["Subscriber", GROUP_COUNTS],
    }),
    updateSubscriber: builder.mutation<Subscriber, { subscriberId: string } & Partial<SubscriberInput>>({
      query: ({ subscriberId, ...body }) => ({ url: `/subscribers/${subscriberId}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { subscriberId }) => [...itemTag("Subscriber", subscriberId), ALL_LISTS, GROUP_COUNTS],
    }),
    deleteSubscriber: builder.mutation<void, { subscriberId: string }>({
      query: ({ subscriberId }) => ({ url: `/subscribers/${subscriberId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { subscriberId }) => [...itemTag("Subscriber", subscriberId), ALL_LISTS, GROUP_COUNTS],
    }),
    /** Deletes many subscribers; ones a campaign was already sent to are kept and returned in `blocked_ids`. */
    deleteSubscribers: builder.mutation<SubscriberBulkDeleteResult, { subscriberIds: string[] }>({
      query: ({ subscriberIds }) => ({ url: `/subscribers/bulk-delete`, method: "POST", body: { subscriber_ids: subscriberIds } }),
      // Deleted rows leave every list, campaign audience and group count; their own pages go too.
      invalidatesTags: ["Subscriber", GROUP_COUNTS],
    }),
    /** Removes many subscribers from one group; they stay subscribers and keep their other groups. */
    removeSubscribersFromGroup: builder.mutation<GroupMembersRemoveResult, { groupId: string; subscriberIds: string[] }>({
      query: ({ groupId, subscriberIds }) => ({ url: `/groups/${groupId}/subscribers/bulk-remove`, method: "POST", body: { subscriber_ids: subscriberIds } }),
      // Each removed subscriber's `group_ids` changes, as do the lists and the group's count.
      invalidatesTags: ["Subscriber", GROUP_COUNTS],
    }),
    /** Adds an existing subscriber to a group; they keep their other groups. */
    addSubscriberToGroup: builder.mutation<Subscriber, { groupId: string; subscriberId: string }>({
      query: ({ groupId, subscriberId }) => ({ url: `/groups/${groupId}/subscribers`, method: "POST", body: { subscriber_id: subscriberId } }),
      invalidatesTags: (_r, _e, { subscriberId }) => [...itemTag("Subscriber", subscriberId), ALL_LISTS, GROUP_COUNTS],
    }),
    /** Removes a subscriber from one group; the subscriber is kept. */
    removeSubscriberFromGroup: builder.mutation<Subscriber, { groupId: string; subscriberId: string }>({
      query: ({ groupId, subscriberId }) => ({ url: `/groups/${groupId}/subscribers/${subscriberId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { subscriberId }) => [...itemTag("Subscriber", subscriberId), ALL_LISTS, GROUP_COUNTS],
    }),
  }),
});

export const {
  useGetSubscribersQuery,
  useGetCampaignSubscribersQuery,
  useGetGroupSubscribersQuery,
  useGetSubscriberQuery,
  useCreateSubscriberMutation,
  useImportSubscribersMutation,
  useUpdateSubscriberMutation,
  useDeleteSubscriberMutation,
  useAddSubscriberToGroupMutation,
  useRemoveSubscriberFromGroupMutation,
  useDeleteSubscribersMutation,
  useRemoveSubscribersFromGroupMutation,
} = subscribersApi;
