import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./api/apiSlice";
import { keysReducer } from "@/features/keys/slice";
import { campaignsReducer } from "@/features/campaigns/slice";
import { templatesReducer } from "@/features/templates/slice";
import { groupsReducer } from "@/features/groups/slice";
import { recipientsReducer } from "@/features/recipients/slice";
import { identitiesReducer } from "@/features/identities/slice";
import { addressesReducer } from "@/features/addresses/slice";
import { contactDetailsReducer } from "@/features/contactDetails/slice";

export function makeStore() {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      keys: keysReducer,
      campaigns: campaignsReducer,
      templates: templatesReducer,
      groups: groupsReducer,
      recipients: recipientsReducer,
      identities: identitiesReducer,
      addresses: addressesReducer,
      contactDetails: contactDetailsReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
