//Tái sử dụng signup trong /api/tool/ để đăng ký người dùng
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { signupSchema } from "../../schema/auth";

const handleError = (error: any, request: any, reply: any) => {
  request.log.error(error);
  reply.status(500).send({ error: "Signup - Internal Server Error" });
};

export async function signup(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Validate request body with Zod
    const body = signupSchema.parse(request.body);
    const { username, email, password } = body;
    // Check email in database
    const existingEmail = await fastify.prisma.user.findFirst({
      where: {
        email,
      },
    });
    if (existingEmail) {
      reply.status(409).send({
        statusCode: 409,
        message: "User with this email already exists",
        field: "email",
      });
      return;
    }

    //Check username in database
    const existingUsername = await fastify.prisma.profile.findFirst({
      where: {
        username,
      },
    });
    if (existingUsername) {
      reply.status(409).send({
        statusCode: 409,
        message: "Username already taken",
        field: "username",
      });
      return;
    }

    function generateApiKey(length: number = 32): string {
      return randomBytes(length).toString("hex").slice(0, length);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await fastify.prisma.$transaction(async (prisma) => {
      const createdUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
        },
      });
      await prisma.profile.create({
        data: {
          userId: createdUser.id,
          username: username,
          apiKey: generateApiKey(),
        },
      });
      return createdUser;
    });
    reply.status(201).send(newUser);
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof Error && "errors" in error) {
      reply.status(400).send({ errors: error.errors });
    } else {
      handleError(error, request, reply);
    }
  }
}
