import { FastifyPluginAsync } from "fastify";
import { login } from "./login";
import { signup } from "./signup";

const user: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const handleError = (error: any, request: any, reply: any) => {
    request.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  };
  //POST /user/signup
  fastify.post("/signup", async function (request, reply) {
    //Sử dụng signup.ts
    await signup(fastify, request, reply);
  });

  // POST /user/login
  fastify.post("/login", async function (request, reply) {
    //Sử dụng login.ts
    await login(fastify, request, reply);
  });

  // POST /user/logout
  fastify.post("/logout", async function (request, reply) {
    try {
      reply.clearCookie("token", {
        path: "/",
      });
      reply.send({ message: "Logout successful" });
    } catch (error) {
      reply.status(500).send({ error: "Logout failed" });
    }
  });

  // GET /user/:id
  fastify.get(
    "/:id",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      const { id } = request.params as { id: string };
      const userToken = request.user as { id: number; email: string };
      if (Number(id) !== userToken.id) {
        return reply
          .status(403)
          .send({ error: "Forbidden: You can only view your own profile" });
      }
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: Number(id) },
        });

        if (user) {
          reply.send(user);
        } else {
          reply.status(404).send({ error: "User not found" });
        }
      } catch (error) {
        handleError(error, request, reply);
      }
    }
  );

  //GET /user/
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
          const users = await fastify.prisma.user.findMany({
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  role: true,
                  type: true,
                },
              },
            },
          });
          const result = users.map((user) => ({
            id: user.id,
            email: user.email,
            role: user.profile?.role,
            type: user.profile?.type,
          }));
          reply.send(result);
        } else {
          reply.status(403).send({ error: "Access denied" });
        }
      } catch (error) {
        handleError(error, request, reply);
      }
    }
  );
};

export default user;
