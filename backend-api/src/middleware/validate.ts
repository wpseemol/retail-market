import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

/**
 * Parse JSON body with Zod. On success, merge parsed fields onto `req.body`
 * so transforms apply without dropping extras controllers still read
 * (e.g. `captchaToken` alongside login/register schemas).
 */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const base =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    req.body = { ...base, ...(parsed.data as object) };
    return next();
  };
}
