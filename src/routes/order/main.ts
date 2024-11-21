import { FastifyPluginAsync } from "fastify"

const order: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/', async function (request, reply) {
    return 'Sử dụng API này để quản lý chung'
  })
}

export default order;