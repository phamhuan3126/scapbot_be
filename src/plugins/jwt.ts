import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * This plugin a JWT utils for Fastify
 *
 * @see https://github.com/fastify/fastify-jwt
 */
export default fp(async (fastify) => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET || "ScapBotJSC",
    cookie: {
      cookieName: 'token',
      signed: false
    }
  })

  // Add a preHandler hook to verify JWT for protected routes
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ message: 'Unauthorized' })
    }
  })

  // Apply the preHandler hook conditionally
  fastify.addHook('preHandler', async (request, reply) => {
    const url = request.raw.url;
    if (url !== '/user/signup' && url !== '/user/login' && url !== '/') {
      await fastify.authenticate(request, reply)
    }
  })
  
})

// Use TypeScript module augmentation to declare the type of server.authenticate
declare module 'fastify' {
    interface FastifyInstance {
      authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }
}