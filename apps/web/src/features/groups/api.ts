import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { Group, GroupInput } from "./model";

/**
 * Groups are a shared library. A campaign's groups (`getCampaignGroups`) are
 * read-only here - they're set on the campaign itself - and are tagged
 * `CAMPAIGN_<id>` so saving the campaign refreshes them.
 */
export const groupsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGroups: builder.query<Group[], PageArgs>({
      query: (args) => ({
        url: `/groups`,
        params: args,
      }),
      providesTags: (result) => listTags("Group", result),
    }),
    getCampaignGroups: builder.query<Group[], { campaignId: string } & PageArgs>({
      query: ({ campaignId, ...args }) => ({
        url: `/campaigns/${campaignId}/groups`,
        params: args,
      }),
      providesTags: (result, _e, { campaignId }) => listTags("Group", result, [`CAMPAIGN_${campaignId}`]),
    }),
    getGroup: builder.query<Group, { groupId: string }>({
      query: ({ groupId }) => `/groups/${groupId}`,
      providesTags: (_r, _e, { groupId }) => itemTag("Group", groupId),
    }),
    createGroup: builder.mutation<Group, GroupInput>({
      query: (body) => ({
        url: `/groups`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Group", id: "LIST" }],
    }),
    updateGroup: builder.mutation<Group, { groupId: string } & Partial<GroupInput>>({
      query: ({ groupId, ...body }) => ({
        url: `/groups/${groupId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { groupId }) => itemTag("Group", groupId),
    }),
    deleteGroup: builder.mutation<void, { groupId: string }>({
      query: ({ groupId }) => ({
        url: `/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        ...itemTag("Group", groupId),
        { type: "Group", id: "LIST" },
        // Campaigns that sent to it lose it from their group_ids.
        { type: "Campaign", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetGroupsQuery,
  useGetCampaignGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
} = groupsApi;
