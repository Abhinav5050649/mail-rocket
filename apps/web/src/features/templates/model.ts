export type { Template } from "@/types/resources";

export interface TemplateInput {
  name: string;
  html_body?: string;
}

/** No standalone filters today; kept for uniformity with the other list features. */
export type TemplateFilters = object;
