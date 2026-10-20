export type { ApiKey } from "@/types/resources";

export interface SigninRequest {
  /** A mail-rocket API key (`mr_...`). */
  key: string;
}
