export type { ContactDetails } from "@/types/resources";

export interface ContactDetailsInput {
  email_id?: string;
  country_code?: string;
  phone_number?: string;
}

export type ContactDetailsFilters = object;
