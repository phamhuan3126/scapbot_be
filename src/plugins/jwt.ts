import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, Profile } from '@prisma/client';

/**
 * This plugin a JWT utils for Fastify
 *
 * @see https://github.com/fastify/fastify-jwt
 */
export default fp(async (fastify) => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET || "ScapBotJSC",
    cookie: {
      cookieName: "token",
      signed: false,
    },
  });

  // Add a preHandler hook to verify JWT for protected routes
  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ message: "Unauthorized" });
      }
    }
  );

  // Add a preHandler hook to verify API Key for protected routes
  fastify.decorate(
    "authenticateApiKey",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const apiKey = request.headers["x-api-key"];
      if (!apiKey || Array.isArray(apiKey)) {
        return reply.code(401).send({ message: "apiKey Missing" });
      }

      const profile = await fastify.prisma.profile.findUnique({
        where: { apiKey },
      });

      if (!profile) {
        return reply.code(401).send({ message: "apiKey not found" });
      }
      //Truyền thông tin user vào biến dựa vào apiKey
      request.profile = profile;
    }
  );

  // Apply the preHandler hook conditionally
  fastify.addHook("preHandler", async (request, reply) => {
    const url = request.raw.url;
    const publicRoutes = ['/docs', '/user/signup', '/user/login'];
    if (url && (url === '/' || url ==='/api/' || publicRoutes.some(route => url.startsWith(route)))) {
      return;
    }

    interface JWTPayload {
      id: string;
    }
  
    if (url && url.startsWith("/api/")) {
      try {
        // Verify JWT token
        const decoded = await request.jwtVerify() as JWTPayload;
        const userId = parseInt(decoded.id, 10);
        const profile = await fastify.prisma.profile.findUnique({
          where: { userId: userId }
        });
        if (!profile) {
          throw new Error('Profile not found');
        }
        //Truyền thông tin user vào biến dựa vào token
        request.profile = profile;
        return;
      } catch (err) {
        await fastify.authenticateApiKey(request, reply);
      }
    } else {
      await fastify.authenticate(request, reply);
    }
  });
});

// Use TypeScript module augmentation to declare the type of server.authenticate
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authenticateApiKey: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    prisma: PrismaClient
  }

  interface FastifyRequest {
    profile?: Profile;
  }
}
