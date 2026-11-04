import { createListFeatureSlice } from "@/lib/redux/createListFeatureSlice";
import type { GroupFilters } from "./model";

const groupsSlice = createListFeatureSlice<GroupFilters>("groups", {});

export const {
  filtersChanged: groupFiltersChanged,
  filtersCleared: groupFiltersCleared,
  createDialogOpened: groupCreateDialogOpened,
  editDialogOpened: groupEditDialogOpened,
  deleteDialogOpened: groupDeleteDialogOpened,
  dialogClosed: groupDialogClosed,
} = groupsSlice.actions;

export const groupsReducer = groupsSlice.reducer;
