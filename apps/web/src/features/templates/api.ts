import { apiSlice } from "@/lib/redux/api/apiSlice";
import { listTags, itemTag } from "@/lib/redux/api/tagHelpers";
import type { PageArgs } from "@/types/resources";
import type { Template, TemplateInput } from "./model";

/**
 * Templates are reachable both top-level (`getTemplates`) and campaign-nested
 * (`getCampaignTemplates`, a GET/POST-only view onto the same rows). Scoped
 * tag ids (`CAMPAIGN_<id>`) let a mutation refresh both cached views at once.
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
    getCampaignTemplates: builder.query<Template[], { campaignId: string } & PageArgs>({
      query: ({ campaignId, ...args }) => ({
        url: `/campaigns/${campaignId}/templates`,
        params: args,
      }),
      providesTags: (result, _e, { campaignId }) => listTags("Template", result, [`CAMPAIGN_${campaignId}`]),
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
      invalidatesTags: (result) => [
        { type: "Template", id: "LIST" },
        ...(result?.campaign_id ? [{ type: "Template" as const, id: `CAMPAIGN_${result.campaign_id}` }] : []),
      ],
    }),
    createCampaignTemplate: builder.mutation<
      Template,
      { campaignId: string } & TemplateInput
    >({
      query: ({ campaignId, ...body }) => ({
        url: `/campaigns/${campaignId}/templates`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { campaignId }) => [
        { type: "Template", id: "LIST" },
        { type: "Template", id: `CAMPAIGN_${campaignId}` },
      ],
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
      invalidatesTags: (result, _e, { templateId }) => [
        ...itemTag("Template", templateId),
        ...(result?.campaign_id ? [{ type: "Template" as const, id: `CAMPAIGN_${result.campaign_id}` }] : []),
      ],
    }),
    deleteTemplate: builder.mutation<void, { templateId: string; campaignId?: string }>({
      query: ({ templateId }) => ({
        url: `/templates/${templateId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { templateId, campaignId }) => [
        ...itemTag("Template", templateId),
        { type: "Template", id: "LIST" },
        ...(campaignId ? [{ type: "Template" as const, id: `CAMPAIGN_${campaignId}` }] : []),
      ],
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetCampaignTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useCreateCampaignTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
} = templatesApi;
