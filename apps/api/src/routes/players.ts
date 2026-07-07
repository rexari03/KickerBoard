import type { FastifyInstance } from "fastify";
import { requireAdminUser } from "../auth/guards.js";
import { prisma } from "../prisma.js";

type CreatePlayerBody = {
  email?: unknown;
  displayName?: unknown;
};

export async function registerPlayerRoutes(server: FastifyInstance) {
  server.get("/players", async () => {
    return prisma.playerProfile.findMany({
      orderBy: {
        displayName: "asc"
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      }
    });
  });

  server.post<{ Body: CreatePlayerBody }>("/players", async (request, reply) => {
    const admin = await requireAdminUser(request, reply);

    if (!admin) {
      return;
    }

    const email = normalizeString(request.body.email);
    const displayName = normalizeString(request.body.displayName);

    if (!email || !displayName) {
      return reply.code(400).send({
        error: "email and displayName are required"
      });
    }

    try {
      const player = await prisma.user.create({
        data: {
          email,
          profile: {
            create: {
              displayName
            }
          }
        },
        include: {
          profile: true
        }
      });

      return reply.code(201).send(player);
    } catch {
      return reply.code(409).send({
        error: "email or displayName already exists"
      });
    }
  });
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
