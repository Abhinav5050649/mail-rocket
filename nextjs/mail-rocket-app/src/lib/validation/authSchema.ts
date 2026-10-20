import { z } from "zod";
import { PRESETS } from "@/lib/auth/abilities";

export const signinSchema = z.object({
  key: z.string().trim().min(1, "API key is required"),
});
export type SigninFormValues = z.infer<typeof signinSchema>;

export const keyCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Keep it under 100 characters"),
  preset: z.enum(PRESETS),
  /** `YYYY-MM-DD` from a date input, or empty for a key that never expires. */
  expires_on: z.string().optional(),
});
export type KeyCreateFormValues = z.infer<typeof keyCreateSchema>;
