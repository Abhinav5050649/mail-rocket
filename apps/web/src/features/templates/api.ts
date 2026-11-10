import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { Template, TemplateInput } from "./model";

/**
 * Templates are a shared library: campaigns pick one by `template_id`, so
 * there's no campaign-scoped template list to keep in sync.
 */
export const templatesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTemplates: builder.query<Template[], PageArgs>({
      query: (args) => ({
        url: `/templates`,
        params: args,
      }),
      providesTags: (result) => listTags("Template", result),
    }),
    getTemplate: builder.query<Template, { templateId: string }>({
      query: ({ templateId }) => `/templates/${templateId}`,
      providesTags: (_r, _e, { templateId }) => itemTag("Template", templateId),
    }),
    createTemplate: builder.mutation<Template, TemplateInput>({
      query: (body) => ({
        url: `/templates`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Template", id: "LIST" }],
    }),
    updateTemplate: builder.mutation<
      Template,
      { templateId: string } & Partial<TemplateInput>
    >({
      query: ({ templateId, ...body }) => ({
        url: `/templates/${templateId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { templateId }) => itemTag("Template", templateId),
    }),
    deleteTemplate: builder.mutation<void, { templateId: string }>({
      query: ({ templateId }) => ({
        url: `/templates/${templateId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { templateId }) => [
        ...itemTag("Template", templateId),
        { type: "Template", id: "LIST" },
        // A draft that picked it has its template cleared.
        { type: "Campaign", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
} = templatesApi;
