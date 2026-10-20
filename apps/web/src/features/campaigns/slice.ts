import { createListFeatureSlice } from "@/lib/redux/createListFeatureSlice";
import type { CampaignFilters } from "./model";

const campaignsSlice = createListFeatureSlice<CampaignFilters>("campaigns", {});

export const {
  filtersChanged: campaignFiltersChanged,
  filtersCleared: campaignFiltersCleared,
  createDialogOpened: campaignCreateDialogOpened,
  editDialogOpened: campaignEditDialogOpened,
  deleteDialogOpened: campaignDeleteDialogOpened,
  dialogClosed: campaignDialogClosed,
} = campaignsSlice.actions;

export const campaignsReducer = campaignsSlice.reducer;
