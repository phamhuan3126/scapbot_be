import { FastifyPluginAsync } from "fastify"

const indexing: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return 'this is an indexing request'
  })
}

export default indexing;