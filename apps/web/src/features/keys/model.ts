import type { Claim, KeyPreset } from "@mail-rocket/shared";
export type { ApiKey, ApiKeySummary, ApiKeyCreated } from "@/types/resources";

export interface KeyCreateInput {
  name: string;
  preset: KeyPreset;
  /** ISO datetime, or omitted/null for a key that never expires. */
  expires_at?: string | null;
  description?: string;
}

/** Either `preset` or `claims` may change a key's grants - never both. */
export interface KeyUpdateInput {
  name?: string;
  preset?: KeyPreset;
  claims?: Claim[];
  expires_at?: string | null;
  description?: string;
}

/** No list filters exist for keys; kept so the slice factory stays uniform across features. */
export type KeyFilters = object;
