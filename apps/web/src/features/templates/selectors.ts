import type { RootState } from "@/lib/redux/store";

export const selectTemplateFilters = (state: RootState) => state.templates.filters;
export const selectTemplateDialog = (state: RootState) => state.templates.dialog;
