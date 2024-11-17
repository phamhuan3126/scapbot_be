import { FastifyPluginAsync } from "fastify"

const entityCaptcha: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // POST /entity/captcha
  fastify.post('/', async (request, reply) => {
    const { provider, api, balance, status } = request.body as {
      provider?: 'CAPTCHA2'; 
      api: string;
      balance: number;
      status?: 'FULL' | 'MEDIUM' | 'LOW' | 'DIE';
    };
  
    try {
      const newEntityCaptcha = await fastify.prisma.entityCaptcha.create({
        data: {
          provider: provider || 'CAPTCHA2',
          api,
          balance,
          status: status || 'DIE',
        },
      });
      
      reply.code(201).send(newEntityCaptcha);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to create the captcha' });
    }
  });
  
}

export default entityCaptcha;