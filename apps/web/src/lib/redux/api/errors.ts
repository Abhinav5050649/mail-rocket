import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

/** Extracts apps/api's `{error: string}` shape from an RTK Query error, with a generic fallback. */
export function getApiErrorMessage(error: FetchBaseQueryError | SerializedError | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  if ("status" in error) {
    const data = error.data;
    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
      return data.error;
    }
    return `Request failed (${error.status})`;
  }
  return error.message ?? "Something went wrong. Please try again.";
}
