/**
 * Tính năng dùng cho các công cụ bên ngoài như BAS
 *
 */

import { FastifyPluginAsync } from "fastify";
import { login } from "../../user/login";

const tool: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const handleError = (error: any, request: any, reply: any) => {
    request.log.error(error);
    reply.status(500).send({ error: "Tool - Internal Server Error" });
  };
  //Kiểm tra user
  fastify.post("/user-verify", async function (request, reply) {
    try {
      const profile = request.profile; // Chỉ user có quyền ADMIN mới được kiểm tra
      if (profile && profile.role === "ADMIN") {
        await login(fastify, request, reply);
      } else {
        reply.status(403).send({ error: "Access denied" });
      }
    } catch (error) {
      handleError(error, request, reply);
    }
  });
};

export default tool;
