import { createHash, randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../prisma.js";

export const sessionCookieName =
  process.env.SESSION_COOKIE_NAME ?? "kicker_board_session";

const ttlDays = Number(process.env.SESSION_TTL_DAYS ?? 14);
const ttlMs = ttlDays * 24 * 60 * 60 * 1000;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function setSessionCookie(reply: FastifyReply, token: string) {
  reply.setCookie(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ttlMs / 1000)
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(sessionCookieName, {
    path: "/"
  });
}

export async function createSession(request: FastifyRequest, userId: string) {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip
    }
  });

  return token;
}

export async function getCurrentSession(request: FastifyRequest) {
  const token = request.cookies[sessionCookieName];

  if (!token) {
    return null;
  }

  return prisma.session.findFirst({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  });
}

export async function revokeCurrentSession(request: FastifyRequest) {
  const token = request.cookies[sessionCookieName];

  if (!token) {
    return;
  }

  await prisma.session.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}
