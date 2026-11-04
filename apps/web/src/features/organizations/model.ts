export type { Organization } from "@/types/resources";

export interface OrganizationInput {
  name: string;
  /** IANA time zone, e.g. "Europe/London". */
  timezone?: string;
  description?: string;
}
