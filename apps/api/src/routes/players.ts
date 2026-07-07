import type { FastifyInstance } from "fastify";
import { requireAdminUser } from "../auth/guards.js";
import { prisma } from "../prisma.js";

export async function registerPlayerRoutes(server: FastifyInstance) {
  server.get("/admin/users", async (request, reply) => {
    const admin = await requireAdminUser(request, reply);

    if (!admin) {
      return;
    }

    return prisma.user.findMany({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
  });
}
