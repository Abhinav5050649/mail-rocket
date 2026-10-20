import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * UI-only state for a list feature: which create/edit/delete dialog (if any)
 * is open, and for edit/delete, which row id it targets. This is the
 * "branch store" for dialogs specifically - the create/edit form's own field
 * values still live in react-hook-form, local to the form component; this
 * only tracks *which* dialog is showing, which is genuinely shared UI state
 * (e.g. a list row's delete button and the confirmation dialog it opens are
 * different components).
 */
export type FeatureDialogState = { type: "create" } | { type: "edit"; id: string } | { type: "delete"; id: string } | null;

export interface ListFeatureState<Filters> {
  filters: Filters;
  dialog: FeatureDialogState;
}

/**
 * Factory for a per-resource "list feature" slice: filters (e.g. campaign
 * status, identity type) plus dialog visibility. Every list-view feature
 * (campaigns, templates, groups, recipients, identities, addresses,
 * contact details, keys) builds its slice.ts on this, so the
 * actions/reducers stay consistent instead of hand-rolling the same shape
 * eight times.
 */
export function createListFeatureSlice<Filters extends object>(name: string, initialFilters: Filters) {
  const initialState: ListFeatureState<Filters> = { filters: initialFilters, dialog: null };

  return createSlice({
    name,
    initialState,
    reducers: {
      filtersChanged(state, action: PayloadAction<Partial<Filters>>) {
        Object.assign(state.filters as object, action.payload);
      },
      filtersCleared(state) {
        state.filters = initialFilters as unknown as typeof state.filters;
      },
      createDialogOpened(state) {
        state.dialog = { type: "create" };
      },
      editDialogOpened(state, action: PayloadAction<string>) {
        state.dialog = { type: "edit", id: action.payload };
      },
      deleteDialogOpened(state, action: PayloadAction<string>) {
        state.dialog = { type: "delete", id: action.payload };
      },
      dialogClosed(state) {
        state.dialog = null;
      },
    },
  });
}
