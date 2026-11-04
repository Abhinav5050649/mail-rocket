import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().trim().min(1, "Give the campaign a name"),
  subject: z.string().optional(),
  /** `YYYY-MM-DDTHH:mm` from a datetime-local input, in the viewer's time zone; empty = no send scheduled. */
  start_time: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "Enter a valid date and time"),
  identity_id: z.string().optional(),
  description: z.string().optional(),
});
export type CampaignFormValues = z.infer<typeof campaignSchema>;
