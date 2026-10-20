import type { RootState } from "@/lib/redux/store";

export const selectAddressFilters = (state: RootState) => state.addresses.filters;
export const selectAddressDialog = (state: RootState) => state.addresses.dialog;
