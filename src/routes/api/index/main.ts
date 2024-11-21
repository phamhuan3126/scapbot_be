import { FastifyPluginAsync } from "fastify";
import validator from "validator";

const index: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const handleError = (error: any, request: any, reply: any) => {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  };

  interface IndexRequestBody {
    description?: string;
    status?: "DRAFT" | "RUNNING";
  }

  //POST /api/index/
  fastify.post<{ Body: IndexRequestBody }>(
    "/",
    async function (request, reply) {
      try {
        const { description } = request.body;
        const userId = request.profile?.userId;
        if (!userId) {
          return reply.status(401).send({ error: "Index Unauthorized" });
        }
        // Cần fix lại là chỉ giới hạn với User type là: NORMAL, Advanced hoặc Priority thì không giới hạn
        const existingDraftRequest =
          await fastify.prisma.indexRequest.findFirst({
            where: {
              userId: userId,
              status: "DRAFT",
            },
          });
        if (existingDraftRequest) {
          return reply.status(400).send({ error: "Too many index request. You need to update the status for the current request." });
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

  //PATCH /api/index/:id
  fastify.patch<{ Body: IndexRequestBody }>(
    "/:id",
    async function (request, reply) {
      const { id } = request.params as { id: string };
      try {
        const { description, status } = request.body;
        const userId = request.profile?.userId;
        if (!userId) {
          return reply.status(401).send({ error: "Index Unauthorized" });
        }
        const indexRequest = await fastify.prisma.indexRequest.findUnique({
          where: { id: parseInt(id, 10) },
        });
        if (!indexRequest || indexRequest.userId !== userId) {
          return reply
            .status(404)
            .send({ error: "Index request not found or access denied" });
        }

        //Check point need (Cần update, bỏ qua check nếu role user là: Admin)
        if (status === "RUNNING" && indexRequest.status === "DRAFT") {
          const totalCredit = await fastify.prisma.transaction.aggregate({
            _sum: {
              points: true,
            },
            where: {
              userId,
              type: "CREDIT",
            },
          });

          const totalDebit = await fastify.prisma.transaction.aggregate({
            _sum: {
              points: true,
            },
            where: {
              userId,
              type: "DEBIT",
            },
          });

          const totalPoints =
            (totalCredit._sum.points || 0) - (totalDebit._sum.points || 0);
          const pointsNeeded = await fastify.prisma.indexLink.count({
            where: { requestId: parseInt(id, 10) },
          });

          if (totalPoints < pointsNeeded) {
            return reply.status(400).send({
              error: "Not enough points to update status to RUNNING.",
            });
          }
        } else if (
          status &&
          !(indexRequest.status === "DRAFT" && status === "RUNNING")
        ) {
          return reply.status(400).send({
            error: "Status can only be updated from DRAFT to RUNNING",
          });
        }

        //Update database
        const updatedIndexRequest = await fastify.prisma.indexRequest.update({
          where: { id: parseInt(id, 10) },
          data: {
            description: description ?? undefined,
            status: status ?? undefined,
          },
        });

        //Update URL status
        if (status === "RUNNING") {
          await fastify.prisma.indexLink.updateMany({
            where: {
              requestId: parseInt(id, 10),
              status: "PENDING",
            },
            data: {
              status: "INDEXING",
            },
          });
        }
        return reply.status(200).send(updatedIndexRequest);
      } catch (error) {
        handleError(error, request, reply);
      }
    }
  );

  // GET /api/index
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
        select: {
          id: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
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

  //POST /api/index/:requestId
  interface IndexLinkBody {
    urls: string[];
  }

  fastify.post<{
    Params: { requestId: string };
    Body: IndexLinkBody;
  }>("/:requestId", async function (request, reply) {
    const { requestId } = request.params;
    const { urls } = request.body;
    const userId = request.profile?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const indexRequest = await fastify.prisma.indexRequest.findUnique({
        where: { id: parseInt(requestId, 10) },
        select: { status: true, userId: true },
      });

      if (!indexRequest) {
        return reply.status(404).send({ error: "Request not found." });
      }
      if (indexRequest.userId !== userId) {
        return reply.status(403).send({
          error: "You do not have permission to send URLs for this request.",
        });
      }
      if (indexRequest.status !== "DRAFT") {
        return reply.status(400).send({
          error: "Cannot send URLs for requests that are not in DRAFT status.",
        });
      }
      const urlArray = typeof urls === "string" ? [urls] : urls;
      if (urlArray.length > 100) {
        return reply
          .status(400)
          .send({ error: "Cannot send more than 100 URLs at once." });
      }

      //Validate URL List
      const invalidUrls: string[] = [];
      for (const url of urls) {
        if (!validator.isURL(url, { require_protocol: true })) {
          invalidUrls.push(url);
        }
      }
      if (invalidUrls.length > 0) {
        return reply.status(400).send({
          error: "Invalid URL(s): " + invalidUrls.join(", "),
        });
      }

      const indexLinks = await Promise.all(
        urlArray.map((url) =>
          fastify.prisma.indexLink.create({
            data: {
              requestId: parseInt(requestId, 10),
              url,
            },
            select: {
              id: true,
              url: true,
              status: true,
              createdAt: true,
            },
          })
        )
      );

      return reply.status(201).send(indexLinks);
    } catch (error) {
      handleError(error, request, reply);
    }
  });

  // GET /api/index/:requestId
  fastify.get<{
    Params: { requestId: string };
    Querystring: { status?: string };
  }>("/:requestId", async (request, reply) => {
    const { requestId } = request.params;
    const { status } = request.query;
    const userId = request.profile?.userId;

    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const userRequest = await fastify.prisma.indexRequest.findUnique({
        where: { id: parseInt(requestId, 10) },
        select: { userId: true },
      });
      if (!userRequest || userRequest.userId !== userId) {
        return reply
          .status(403)
          .send({ error: "Access denied to this requestId" });
      }

      const filterConditions: any = { requestId: parseInt(requestId, 10) };
      if (status) {
        filterConditions.status = status.toUpperCase();
      }

      const indexLinks = await fastify.prisma.indexLink.findMany({
        where: filterConditions,
        select: {
          id: true,
          url: true,
          status: true,
          indexed: true,
          updatedAt: true,
        },
      });

      if (indexLinks.length === 0) {
        return reply
          .status(404)
          .send({ error: "No URLs found for this requestId" });
      }

      return reply.status(200).send(indexLinks);
    } catch (error) {
      handleError(error, request, reply);
    }
  });

  // DELETE /api/index/url/:id
  fastify.delete<{ Params: { urlId: string } }>(
    "/url/:urlId",
    async (request, reply) => {
      const { urlId } = request.params;
      const userId = request.profile?.userId;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      try {
        const indexLink = await fastify.prisma.indexLink.findUnique({
          where: { id: parseInt(urlId, 10) },
          select: {
            requestId: true,
            status: true,
          },
        });

        if (!indexLink) {
          return reply.status(404).send({ error: "URL not found" });
        }

        if (indexLink.status !== "PENDING") {
          return reply
            .status(400)
            .send({ error: "Only URLs with PENDING status can be deleted" });
        }

        const userRequest = await fastify.prisma.indexRequest.findUnique({
          where: { id: indexLink.requestId },
          select: { userId: true },
        });

        if (!userRequest || userRequest.userId !== userId) {
          return reply
            .status(403)
            .send({ error: "Access denied to delete this URL" });
        }

        await fastify.prisma.indexLink.delete({
          where: { id: parseInt(urlId, 10) },
        });

        return reply.status(200).send({ message: "URL deleted successfully" });
      } catch (error) {
        handleError(error, request, reply);
      }
    }
  );
};

export default index;