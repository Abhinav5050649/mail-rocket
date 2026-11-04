import { createListFeatureSlice } from "@/lib/redux/createListFeatureSlice";
import type { ContactDetailsFilters } from "./model";

const contactDetailsSlice = createListFeatureSlice<ContactDetailsFilters>("contactDetails", {});

export const {
  filtersChanged: contactDetailsFiltersChanged,
  filtersCleared: contactDetailsFiltersCleared,
  createDialogOpened: contactDetailsCreateDialogOpened,
  editDialogOpened: contactDetailsEditDialogOpened,
  deleteDialogOpened: contactDetailsDeleteDialogOpened,
  dialogClosed: contactDetailsDialogClosed,
} = contactDetailsSlice.actions;

export const contactDetailsReducer = contactDetailsSlice.reducer;
