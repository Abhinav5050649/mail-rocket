import type { RootState } from "@/lib/redux/store";

export const selectGroupFilters = (state: RootState) => state.groups.filters;
export const selectGroupDialog = (state: RootState) => state.groups.dialog;
