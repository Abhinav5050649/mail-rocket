import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { ContactDetails, ContactDetailsInput } from "./model";

export const contactDetailsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getContactDetailsList: builder.query<ContactDetails[], PageArgs>({
      query: (args) => ({
        url: `/contact-details`,
        params: args,
      }),
      providesTags: (result) => listTags("ContactDetails", result),
    }),
    getContactDetails: builder.query<ContactDetails, { contactDetailsId: string }>({
      query: ({ contactDetailsId }) =>
        `/contact-details/${contactDetailsId}`,
      providesTags: (_r, _e, { contactDetailsId }) => itemTag("ContactDetails", contactDetailsId),
    }),
    createContactDetails: builder.mutation<ContactDetails, ContactDetailsInput>({
      query: (body) => ({
        url: `/contact-details`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ContactDetails", id: "LIST" }],
    }),
    updateContactDetails: builder.mutation<
      ContactDetails,
      { contactDetailsId: string } & Partial<ContactDetailsInput>
    >({
      query: ({ contactDetailsId, ...body }) => ({
        url: `/contact-details/${contactDetailsId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { contactDetailsId }) => itemTag("ContactDetails", contactDetailsId),
    }),
    deleteContactDetails: builder.mutation<void, { contactDetailsId: string }>({
      query: ({ contactDetailsId }) => ({
        url: `/contact-details/${contactDetailsId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { contactDetailsId }) => [
        ...itemTag("ContactDetails", contactDetailsId),
        { type: "ContactDetails", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetContactDetailsListQuery,
  useGetContactDetailsQuery,
  useCreateContactDetailsMutation,
  useUpdateContactDetailsMutation,
  useDeleteContactDetailsMutation,
} = contactDetailsApi;
