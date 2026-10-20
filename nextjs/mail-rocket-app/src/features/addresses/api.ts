import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { Address, AddressInput } from "./model";

export const addressesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAddresses: builder.query<Address[], PageArgs>({
      query: (args) => ({
        url: `/addresses`,
        params: args,
      }),
      providesTags: (result) => listTags("Address", result),
    }),
    getAddress: builder.query<Address, { addressId: string }>({
      query: ({ addressId }) => `/addresses/${addressId}`,
      providesTags: (_r, _e, { addressId }) => itemTag("Address", addressId),
    }),
    createAddress: builder.mutation<Address, AddressInput>({
      query: (body) => ({
        url: `/addresses`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Address", id: "LIST" }],
    }),
    updateAddress: builder.mutation<
      Address,
      { addressId: string } & Partial<AddressInput>
    >({
      query: ({ addressId, ...body }) => ({
        url: `/addresses/${addressId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { addressId }) => itemTag("Address", addressId),
    }),
    deleteAddress: builder.mutation<void, { addressId: string }>({
      query: ({ addressId }) => ({
        url: `/addresses/${addressId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { addressId }) => [
        ...itemTag("Address", addressId),
        { type: "Address", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetAddressesQuery,
  useGetAddressQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} = addressesApi;
