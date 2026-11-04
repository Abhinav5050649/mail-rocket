import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { Group, GroupInput } from "./model";

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
      invalidatesTags: (result) => [
        { type: "Group", id: "LIST" },
        ...(result?.campaign_id ? [{ type: "Group" as const, id: `CAMPAIGN_${result.campaign_id}` }] : []),
      ],
    }),
    createCampaignGroup: builder.mutation<Group, { campaignId: string } & GroupInput>({
      query: ({ campaignId, ...body }) => ({
        url: `/campaigns/${campaignId}/groups`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { campaignId }) => [
        { type: "Group", id: "LIST" },
        { type: "Group", id: `CAMPAIGN_${campaignId}` },
      ],
    }),
    updateGroup: builder.mutation<Group, { groupId: string } & Partial<GroupInput>>({
      query: ({ groupId, ...body }) => ({
        url: `/groups/${groupId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, _e, { groupId }) => [
        ...itemTag("Group", groupId),
        ...(result?.campaign_id ? [{ type: "Group" as const, id: `CAMPAIGN_${result.campaign_id}` }] : []),
      ],
    }),
    deleteGroup: builder.mutation<void, { groupId: string; campaignId?: string }>({
      query: ({ groupId }) => ({
        url: `/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { groupId, campaignId }) => [
        ...itemTag("Group", groupId),
        { type: "Group", id: "LIST" },
        ...(campaignId ? [{ type: "Group" as const, id: `CAMPAIGN_${campaignId}` }] : []),
      ],
    }),
  }),
});

export const {
  useGetGroupsQuery,
  useGetCampaignGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useCreateCampaignGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
} = groupsApi;
