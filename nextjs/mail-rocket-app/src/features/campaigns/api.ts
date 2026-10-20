import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { Campaign, CampaignInput, CampaignListArgs } from "./model";

/**
 * Reference implementation of the per-resource RTK Query pattern: list query
 * tags every row + a LIST sentinel, get-by-id tags its own id, create
 * invalidates LIST, update/delete invalidate their own id (+ LIST on
 * delete). The other resource features (templates, groups, recipients,
 * identities, addresses, contact details, keys) repeat
 * this shape.
 */
export const campaignsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCampaigns: builder.query<Campaign[], CampaignListArgs>({
      query: (args) => ({
        url: `/campaigns`,
        params: args,
      }),
      providesTags: (result) => listTags("Campaign", result),
    }),
    getCampaign: builder.query<Campaign, { campaignId: string }>({
      query: ({ campaignId }) => `/campaigns/${campaignId}`,
      providesTags: (_r, _e, { campaignId }) => itemTag("Campaign", campaignId),
    }),
    createCampaign: builder.mutation<Campaign, CampaignInput>({
      query: (body) => ({
        url: `/campaigns`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Campaign", id: "LIST" }],
    }),
    updateCampaign: builder.mutation<
      Campaign,
      { campaignId: string } & Partial<CampaignInput>
    >({
      query: ({ campaignId, ...body }) => ({
        url: `/campaigns/${campaignId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { campaignId }) => itemTag("Campaign", campaignId),
    }),
    deleteCampaign: builder.mutation<void, { campaignId: string }>({
      query: ({ campaignId }) => ({
        url: `/campaigns/${campaignId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { campaignId }) => [
        ...itemTag("Campaign", campaignId),
        { type: "Campaign", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
} = campaignsApi;
