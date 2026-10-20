import type { ApiKey } from "@/types/resources";

/** The signed-in principal. There is no user behind it - the API key is the principal. */
export type Me = ApiKey;
