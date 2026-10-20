import { apiSlice } from "@/lib/redux/api/apiSlice";
import type { Overview } from "./model";

/**
 * The dashboard's counts. Tagged with every resource's LIST sentinel, so
 * creating or deleting anything refreshes the overview too.
 */
export const overviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOverview: builder.query<Overview, void>({
      query: () => "/overview",
      providesTags: [
        { type: "Campaign", id: "LIST" },
        { type: "Identity", id: "LIST" },
        { type: "Template", id: "LIST" },
        { type: "Group", id: "LIST" },
        { type: "Recipient", id: "LIST" },
        { type: "Key", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetOverviewQuery } = overviewApi;
