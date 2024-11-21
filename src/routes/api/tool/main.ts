/**
 * Tính năng dùng cho các công cụ bên ngoài như BAS
 * 
 * Cần bảo mật bằng API quyền admin
 * 
 */

import { FastifyPluginAsync } from 'fastify'

const tool: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return { "ScapBot JSC": "all right reserved" }
  })
}

export default tool;