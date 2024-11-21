/**
 * Tính năng dùng cho tính năng Social
 * 
 */

import { FastifyPluginAsync } from 'fastify'

const social: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return { "ScapBot JSC": "all right reserved" }
  })
}

export default social;