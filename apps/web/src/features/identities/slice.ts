import { createListFeatureSlice } from "@/lib/redux/createListFeatureSlice";
import type { IdentityFilters } from "./model";

const identitiesSlice = createListFeatureSlice<IdentityFilters>("identities", {});

export const {
  filtersChanged: identityFiltersChanged,
  filtersCleared: identityFiltersCleared,
  createDialogOpened: identityCreateDialogOpened,
  editDialogOpened: identityEditDialogOpened,
  deleteDialogOpened: identityDeleteDialogOpened,
  dialogClosed: identityDialogClosed,
} = identitiesSlice.actions;

export const identitiesReducer = identitiesSlice.reducer;
