import type { FastifyInstance } from "fastify";
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
    const email = normalizeString(request.body.email);
    const displayName = normalizeString(request.body.displayName);

    if (!email || !displayName) {
      return reply.code(400).send({
        error: "email and displayName are required"
      });
    }

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
  });
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
