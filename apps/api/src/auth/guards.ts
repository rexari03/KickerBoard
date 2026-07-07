import type { FastifyReply, FastifyRequest } from "fastify";
import { getCurrentSession } from "./session.js";

export async function requireCurrentUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const session = await getCurrentSession(request);

  if (!session) {
    reply.code(401).send({
      error: "not authenticated"
    });
    return null;
  }

  return session.user;
}

export async function requireAdminUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = await requireCurrentUser(request, reply);

  if (!user) {
    return null;
  }

  if (user.role !== "ADMIN") {
    reply.code(403).send({
      error: "admin privileges required"
    });
    return null;
  }

  return user;
}
