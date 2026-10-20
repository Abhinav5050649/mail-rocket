export type { Address } from "@/types/resources";

export interface AddressInput {
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_primary?: boolean;
}

/** No list filters exist for addresses today; kept as an alias so the slice factory stays uniform across features. */
export type AddressFilters = object;
