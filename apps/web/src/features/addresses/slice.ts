import { createListFeatureSlice } from "@/lib/redux/createListFeatureSlice";
import type { AddressFilters } from "./model";

const addressesSlice = createListFeatureSlice<AddressFilters>("addresses", {});

export const {
  filtersChanged: addressFiltersChanged,
  filtersCleared: addressFiltersCleared,
  createDialogOpened: addressCreateDialogOpened,
  editDialogOpened: addressEditDialogOpened,
  deleteDialogOpened: addressDeleteDialogOpened,
  dialogClosed: addressDialogClosed,
} = addressesSlice.actions;

export const addressesReducer = addressesSlice.reducer;
