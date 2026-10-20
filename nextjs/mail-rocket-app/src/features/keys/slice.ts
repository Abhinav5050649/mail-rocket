import { createListFeatureSlice } from "@/lib/redux/createListFeatureSlice";
import type { KeyFilters } from "./model";

const keysSlice = createListFeatureSlice<KeyFilters>("keys", {});

export const {
  createDialogOpened: keyCreateDialogOpened,
  deleteDialogOpened: keyRevokeDialogOpened,
  dialogClosed: keyDialogClosed,
} = keysSlice.actions;

export const keysReducer = keysSlice.reducer;
