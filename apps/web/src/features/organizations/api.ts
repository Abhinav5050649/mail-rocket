import { apiSlice } from "@/lib/redux/api/apiSlice";
import type { Organization, OrganizationInput } from "./model";

/**
 * The instance's single organization profile. Seeded by apps/api at boot -
 * there's no list, create or delete, only GET/PATCH `/organization`.
 */
export const organizationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrganization: builder.query<Organization, void>({
      query: () => "/organization",
      providesTags: ["Organization"],
    }),
    updateOrganization: builder.mutation<Organization, Partial<OrganizationInput>>({
      query: (body) => ({ url: "/organization", method: "PATCH", body }),
      invalidatesTags: ["Organization"],
    }),
  }),
});

export const { useGetOrganizationQuery, useUpdateOrganizationMutation } = organizationsApi;
