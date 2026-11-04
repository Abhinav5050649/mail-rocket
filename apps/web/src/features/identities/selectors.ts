import type { RootState } from "@/lib/redux/store";

export const selectIdentityFilters = (state: RootState) => state.identities.filters;
export const selectIdentityDialog = (state: RootState) => state.identities.dialog;
