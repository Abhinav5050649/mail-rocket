import { createListFeatureSlice } from "@/lib/redux/createListFeatureSlice";
import type { RecipientFilters } from "./model";

const recipientsSlice = createListFeatureSlice<RecipientFilters>("recipients", {});

export const {
  filtersChanged: recipientFiltersChanged,
  filtersCleared: recipientFiltersCleared,
  createDialogOpened: recipientCreateDialogOpened,
  editDialogOpened: recipientEditDialogOpened,
  deleteDialogOpened: recipientDeleteDialogOpened,
  dialogClosed: recipientDialogClosed,
} = recipientsSlice.actions;

export const recipientsReducer = recipientsSlice.reducer;
