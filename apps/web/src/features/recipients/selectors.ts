import type { RootState } from "@/lib/redux/store";

export const selectRecipientFilters = (state: RootState) => state.recipients.filters;
export const selectRecipientDialog = (state: RootState) => state.recipients.dialog;
