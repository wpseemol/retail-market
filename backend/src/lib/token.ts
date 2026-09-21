import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "./env.js";

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.sub !== "string" ||
    typeof decoded.role !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    sub: decoded.sub,
    role: decoded.role as UserRole,
  };
}
