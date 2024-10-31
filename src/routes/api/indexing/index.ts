import { FastifyPluginAsync } from "fastify";

const indexing: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const handleError = (error: any, request: any, reply: any) => {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  };

  interface IndexRequestBody {
    description?: string;
    status?: "DRAFT" | "RUNNING";
  }

  //POST /api/indexing/
  fastify.post<{ Body: IndexRequestBody }>(
    "/",
    async function (request, reply) {
      try {
        const { description } = request.body;
        const userId = request.profile?.userId;
        if (!userId) {
          return reply.status(401).send({ error: "Unauthorized" });
        }
        const existingDraftRequest =
          await fastify.prisma.indexRequest.findFirst({
            where: {
              userId: userId,
              status: "DRAFT",
            },
          });
        if (existingDraftRequest) {
          return reply.status(400).send({ error: "Too many indexing request" });
        }
        const newIndexRequest = await fastify.prisma.indexRequest.create({
          data: {
            userId: userId,
            description: description,
          },
        });
        return reply.status(201).send(newIndexRequest);
      } catch (error) {
        handleError(error, request, reply);
      }
    }
  );

  //PATCH /api/indexing/:id
  fastify.patch<{ Body: IndexRequestBody }>(
    "/:id",
    async function (request, reply) {
      const { id } = request.params as { id: string };
      try {
        const { description, status } = request.body;
        const userId = request.profile?.userId;
        if (!userId) {
          return reply.status(401).send({ error: "Unauthorized" });
        }
        const indexRequest = await fastify.prisma.indexRequest.findUnique({
          where: { id: parseInt(id, 10) },
        });
        if (!indexRequest || indexRequest.userId !== userId) {
          return reply
            .status(404)
            .send({ error: "Index request not found or access denied" });
        }
        if (
          status &&
          !(indexRequest.status === "DRAFT" && status === "RUNNING")
        ) {
          return reply.status(400).send({
            error: "Status can only be updated from DRAFT to RUNNING",
          });
        }
        const updatedIndexRequest = await fastify.prisma.indexRequest.update({
          where: { id: parseInt(id, 10) },
          data: {
            description: description ?? undefined,
            status: status ?? undefined,
          },
        });
        return reply.status(200).send(updatedIndexRequest);
      } catch (error) {
        handleError(error, request, reply);
      }
    }
  );

  // GET /api/indexing
  fastify.get("/", async function (request, reply) {
    try {
      const userId = request.profile?.userId;
      const { status } = request.query as {
        status?: "DRAFT" | "RUNNING" | "COMPLETE";
      };
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      const indexRequests = await fastify.prisma.indexRequest.findMany({
        where: {
          userId: userId,
          ...(status ? { status } : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reply.status(200).send(indexRequests);
    } catch (error) {
      handleError(error, request, reply);
    }
  });

  //POST /api/indexing/url
  


};

export default indexing;
