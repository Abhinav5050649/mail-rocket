import { createListFeatureSlice } from "@/lib/redux/createListFeatureSlice";
import type { SubscriberFilters } from "./model";

const subscribersSlice = createListFeatureSlice<SubscriberFilters>("subscribers", {});

export const {
  filtersChanged: subscriberFiltersChanged,
  filtersCleared: subscriberFiltersCleared,
  createDialogOpened: subscriberCreateDialogOpened,
  editDialogOpened: subscriberEditDialogOpened,
  deleteDialogOpened: subscriberDeleteDialogOpened,
  dialogClosed: subscriberDialogClosed,
} = subscribersSlice.actions;

export const subscribersReducer = subscribersSlice.reducer;
