import type { FastifyInstance } from "fastify";
import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  clearSessionCookie,
  createSession,
  getCurrentSession,
  setSessionCookie,
  revokeCurrentSession
} from "../auth/session.js";
import { prisma } from "../prisma.js";

type AuthBody = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
};

export async function registerAuthRoutes(server: FastifyInstance) {
  server.post<{ Body: AuthBody }>("/auth/register", async (request, reply) => {
    const email = normalizeEmail(request.body.email);
    const password = normalizePassword(request.body.password);
    const displayName = normalizeString(request.body.displayName);

    if (!email || !password || !displayName) {
      return reply.code(400).send({
        error: "email, password and displayName are required"
      });
    }

    const passwordHash = await hashPassword(password);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          displayName,
          passwordHash
        }
      });

      const token = await createSession(request, user.id);
      setSessionCookie(reply, token);

      return reply.code(201).send(toAuthUser(user));
    } catch {
      return reply.code(409).send({
        error: "email already exists"
      });
    }
  });

  server.post<{ Body: AuthBody }>("/auth/login", async (request, reply) => {
    const email = normalizeEmail(request.body.email);
    const password = normalizePassword(request.body.password);

    if (!email || !password) {
      return reply.code(400).send({
        error: "email and password are required"
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!user?.passwordHash) {
      return reply.code(401).send({
        error: "invalid email or password"
      });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return reply.code(401).send({
        error: "invalid email or password"
      });
    }

    const token = await createSession(request, user.id);
    setSessionCookie(reply, token);

    return toAuthUser(user);
  });

  server.get("/auth/me", async (request, reply) => {
    const session = await getCurrentSession(request);

    if (!session) {
      return reply.code(401).send({
        error: "not authenticated"
      });
    }

    return toAuthUser(session.user);
  });

  server.post("/auth/logout", async (request, reply) => {
    await revokeCurrentSession(request);
    clearSessionCookie(reply);

    return {
      ok: true
    };
  });
}

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    profile: {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: null
    }
  };
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeString(value)?.toLowerCase();
  return normalized && normalized.includes("@") ? normalized : null;
}

function normalizePassword(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return value.length >= 12 ? value : null;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
