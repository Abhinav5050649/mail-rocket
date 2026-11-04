import type { RootState } from "@/lib/redux/store";

export const selectKeyDialog = (state: RootState) => state.keys.dialog;
