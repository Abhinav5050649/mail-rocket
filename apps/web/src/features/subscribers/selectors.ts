import type { RootState } from "@/lib/redux/store";

export const selectSubscriberFilters = (state: RootState) => state.subscribers.filters;
export const selectSubscriberDialog = (state: RootState) => state.subscribers.dialog;
