import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { Subscriber, SubscriberInput } from "./model";

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
    updateSubscriber: builder.mutation<Subscriber, { subscriberId: string } & Partial<SubscriberInput>>({
      query: ({ subscriberId, ...body }) => ({ url: `/subscribers/${subscriberId}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { subscriberId }) => [...itemTag("Subscriber", subscriberId), ALL_LISTS, GROUP_COUNTS],
    }),
    deleteSubscriber: builder.mutation<void, { subscriberId: string }>({
      query: ({ subscriberId }) => ({ url: `/subscribers/${subscriberId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { subscriberId }) => [...itemTag("Subscriber", subscriberId), ALL_LISTS, GROUP_COUNTS],
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
  useUpdateSubscriberMutation,
  useDeleteSubscriberMutation,
  useAddSubscriberToGroupMutation,
  useRemoveSubscriberFromGroupMutation,
} = subscribersApi;
