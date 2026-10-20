import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import { campaignsApi } from "./api";

export const selectCampaignFilters = (state: RootState) => state.campaigns.filters;
export const selectCampaignDialog = (state: RootState) => state.campaigns.dialog;

/** Derived selector: the status filter, or undefined if cleared - what list pages actually pass to `useGetCampaignsQuery`. */
export const selectCampaignStatusFilter = createSelector(selectCampaignFilters, (filters) => filters.status);

/** Reads a single campaign straight out of the RTK Query cache without issuing a new request, for components that only need it if it's already loaded (e.g. the delete confirmation dialog). */
export const selectCachedCampaign = (campaignId: string) => (state: RootState) =>
  campaignsApi.endpoints.getCampaign.select({ campaignId })(state).data;
