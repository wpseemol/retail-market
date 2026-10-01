import { z } from "zod";
import { firstZodError, withSafeInput } from "./safeInput";

export const reviewSearchSchema = withSafeInput(
  z.string().trim().max(120, "Search must be at most 120 characters"),
);

export const reviewReplyFormSchema = z.object({
  reply: withSafeInput(
    z
      .string()
      .trim()
      .min(2, "Write at least 2 characters")
      .max(1000, "Reply must be at most 1000 characters"),
  ),
});

export type ReviewReplyFormValues = z.infer<typeof reviewReplyFormSchema>;

export { firstZodError };
