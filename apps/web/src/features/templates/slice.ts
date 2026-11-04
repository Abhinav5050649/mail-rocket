import { createListFeatureSlice } from "@/lib/redux/createListFeatureSlice";
import type { TemplateFilters } from "./model";

const templatesSlice = createListFeatureSlice<TemplateFilters>("templates", {});

export const {
  filtersChanged: templateFiltersChanged,
  filtersCleared: templateFiltersCleared,
  createDialogOpened: templateCreateDialogOpened,
  editDialogOpened: templateEditDialogOpened,
  deleteDialogOpened: templateDeleteDialogOpened,
  dialogClosed: templateDialogClosed,
} = templatesSlice.actions;

export const templatesReducer = templatesSlice.reducer;
