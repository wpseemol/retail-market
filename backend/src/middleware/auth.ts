import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyAuthToken } from "../lib/token.js";
import { toPublicUser } from "../lib/user.js";

export type AuthUser = ReturnType<typeof toPublicUser>;

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: bigint;
        role: UserRole;
        user: AuthUser;
      };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = header.slice("Bearer ".length).trim();
    const payload = verifyAuthToken(token);
    const userId = BigInt(payload.sub);

    const user = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      include: { avatar: true },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: `Account is ${user.status}` });
    }

    req.auth = {
      userId: user.id,
      role: user.role,
      user: toPublicUser(user),
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    return next();
  };
}

export const STAFF_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "vendor",
];
