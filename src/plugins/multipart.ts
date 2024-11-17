import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import fastifyMultipart from '@fastify/multipart';

const multipartPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.register(fastifyMultipart);
});

export default multipartPlugin;

declare module 'fastify' {
  interface FastifyInstance {
  }
}
