import cors from "@fastify/cors";
import Fastify from "fastify";
import { APP_NAME } from "@kicker-board/shared";

const server = Fastify({
  logger: true
});

await server.register(cors, {
  origin: true
});

server.get("/health", async () => {
  return {
    app: APP_NAME,
    status: "ok"
  };
});

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
