import fp from 'fastify-plugin';
import formbody from '@fastify/formbody';

/**
 * Support content type application/x-www-form-urlencoded
 * @See https://github.com/fastify/fastify-formbody
 * 
 */
export default fp(async (fastify) => {
  fastify.register(formbody);
});