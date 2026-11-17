import { Router } from "express";
import { issueCsrfToken, setCsrfCookie } from "../lib/csrf.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const csrfRouter = Router();

/** Issue a CSRF token for auth forms (login / register). Sets `rm_csrf` cookie. */
csrfRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { token, expiresAt } = issueCsrfToken();
    setCsrfCookie(res, token, expiresAt);
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      csrfToken: token,
      expires_at: new Date(expiresAt).toISOString(),
    });
  }),
);
