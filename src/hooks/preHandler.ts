/*
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export default async function preHandlerHook(fastify: FastifyInstance) {
  fastify.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.raw.url;
    const publicRoutes = ["/docs", "/user/signup", "/user/login"];

    if (url && (url === "/" || url === "/api/" || publicRoutes.some((route) => url.startsWith(route)))) {
      return;
    }

    interface JWTPayload {
        id: string;
      }

    if (url && url.startsWith("/api/")) {
      try {
        // Verify JWT token
        const decoded = (await request.jwtVerify()) as JWTPayload;
        const userId = parseInt(decoded.id, 10);

        const profile = await fastify.prisma.profile.findUnique({
          where: { userId: userId },
        });

        if (!profile) {
          throw new Error("Profile not found");
        }

        // Gắn thông tin user vào request
        (request as any).profile = profile;
        return;
      } catch (err) {
        // Nếu lỗi JWT, thử xác thực bằng API Key
        await fastify.authenticateApiKey(request, reply);
      }
    } else {
      // Xác thực các route khác
      await fastify.authenticate(request, reply);
    }
  });
}
*/