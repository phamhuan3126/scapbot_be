import { FastifyPluginAsync } from "fastify";
import { TransactionType } from "@prisma/client";

const transaction: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  const handleError = (error: any, request: any, reply: any) => {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  };
  interface TransactionRequestBody {
    type: TransactionType;
    service: string;
    reference: string;
    description?: string;
    points: number;
  }
  //POST /transaction/
  fastify.post<{ Body: TransactionRequestBody }>(
    "/",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      const userToken = request.user as { id: number; email: string };
      try {
        const profile = await fastify.prisma.profile.findUnique({
          where: { userId: userToken.id },
        });
        //Chỉ cho phép admin mới có thể thêm các transaction
        if (profile && profile.role === "ADMIN") {
          const { type, service, reference, description, points } =
            request.body;
          if (!type || !service || !reference || !points) {
            return reply.status(400).send({ error: "Missing required fields" });
          }
          const newTransaction = await fastify.prisma.transaction.create({
            data: {
              userId: userToken.id,
              type,
              service,
              reference,
              description,
              points,
            },
          });
          reply.status(201).send(newTransaction);
        } else {
          reply.status(403).send({ error: "Access denied" });
        }
      } catch (error) {
        handleError(error, request, reply);
      }
    }
  );

  //GET /transaction/ (Admin có thể xem được toàn bộ các transaction)
  fastify.get(
    "/",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      const userToken = request.user as { id: number; email: string };
      try {
        const profile = await fastify.prisma.profile.findUnique({
          where: { userId: userToken.id },
        });
        if (profile && profile.role === "ADMIN") {
          const users = await fastify.prisma.transaction.findMany();
          reply.send(users);
        } else {
          reply.status(403).send({ error: "Access denied" });
        }
      } catch (error) {
        handleError(error, request, reply);
      }
    }
  );

  // GET /transaction/:id (Người dùng chỉ có thể xem được các transaction của mình)
  fastify.get(
    "/:id",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      const { id } = request.params as { id: string };
      const userToken = request.user as { id: number; email: string };
      if (Number(id) !== userToken.id) {
        return reply
          .status(403)
          .send({ error: "Forbidden: You can only view your own transaction" });
      }
      try {
        const listTransaction = await fastify.prisma.transaction.findMany({
          where: { userId: Number(id) },
        });

        if (listTransaction) {
          reply.send(listTransaction);
        } else {
          reply.status(404).send({ error: "Transaction not found" });
        }
      } catch (error) {
        handleError(error, request, reply);
      }
    }
  );
};

export default transaction;