import type { RootState } from "@/lib/redux/store";

export const selectContactDetailsFilters = (state: RootState) => state.contactDetails.filters;
export const selectContactDetailsDialog = (state: RootState) => state.contactDetails.dialog;
