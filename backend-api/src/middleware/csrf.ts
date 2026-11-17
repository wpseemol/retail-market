import type { NextFunction, Request, Response } from "express";
import {
  readCookie,
  readSubmittedCsrf,
  CSRF_COOKIE,
  verifyCsrfToken,
} from "../lib/csrf.js";

/**
 * Double-submit + signed CSRF for auth forms.
 * - Token must be HMAC-valid and unexpired (header `X-CSRF-Token` or body `csrfToken`).
 * - When cookie `rm_csrf` is present (browser clients), it must match the submitted token.
 * - Server-to-server callers (NextAuth with app keys, no cookie) rely on the signed body token.
 */
export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  const submitted = readSubmittedCsrf(req);
  if (!submitted || !verifyCsrfToken(submitted)) {
    return res.status(403).json({
      message: "Invalid or missing CSRF token. Refresh the page and try again.",
      code: "CSRF_INVALID",
    });
  }

  const cookie = readCookie(req, CSRF_COOKIE);
  if (cookie && cookie !== submitted) {
    return res.status(403).json({
      message: "CSRF token mismatch. Refresh the page and try again.",
      code: "CSRF_MISMATCH",
    });
  }

  return next();
}
