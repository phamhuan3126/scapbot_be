//Tái sử dụng login trong /api/tool/ để xác thực người dùng
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";

const handleError = (error: any, request: any, reply: any) => {
  request.log.error(error);
  reply.status(500).send({ error: "Login - Internal Server Error" });
};

export async function login(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { email, password } = request.body as {
    email: string;
    password: string;
  };
  try {
    const user = await fastify.prisma.user.findUnique({
      where: { email },
    });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = fastify.jwt.sign({ id: user.id, email: user.email });
      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      reply.send({ message: "Login successful" });
    } else {
      reply.status(401).send({ error: "Invalid email or password" });
    }
  } catch (error) {
    handleError(error, request, reply);
  }
}
