import { FastifyPluginAsync } from "fastify"
import { TransactionType } from '@prisma/client';

const transaction: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const handleError = (error: any, request: any, reply: any) => {
    request.log.error(error);
    reply.status(500).send({ error: 'Internal Server Error' });
  };
  interface TransactionRequestBody {
    type: TransactionType;
    service: string;
    reference: string;
    description?: string;
    points: number;
  }
  //POST /transaction/
  fastify.post<{ Body: TransactionRequestBody }>('/', { preHandler: [fastify.authenticate] }, async function (request, reply) {
    const userToken = request.user as { id: number, email: string };
    try {
      const { type, service, reference, description, points } = request.body;
      if (!type || !service || !reference || !points) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }
      const newTransaction = await fastify.prisma.transaction.create({
        data: {
          userID: userToken.id,
          type,
          service,
          reference,
          description,
          points,
        },
      });
      reply.status(201).send(newTransaction);
    } catch (error) {
      handleError(error, request, reply);
    }
  })

  //GET /transaction/
  fastify.get('/', { preHandler: [fastify.authenticate] }, async function (request, reply) {
    const userToken = request.user as { id: number, email: string };
    try {
      const profile = await fastify.prisma.profile.findUnique({
        where: { userId: userToken.id },
      });
      if (profile && profile.role === 'ADMIN') {
        const users = await fastify.prisma.transaction.findMany();
        reply.send(users);
      } else {
        reply.status(403).send({ error: 'Access denied' });
      }
    } catch (error) {
      handleError(error, request, reply);
    }
  })


}

export default transaction;
