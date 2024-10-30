import { FastifyPluginAsync } from "fastify";
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';


const user: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const handleError = (error: any, request: any, reply: any) => {
    request.log.error(error);
    reply.status(500).send({ error: 'Internal Server Error' });
  };
  //POST /user/signup
  fastify.post('/signup', async function (request, reply) {
    const { email, password } = request.body as { email: string, password: string };
    try {
      const existingUser = await fastify.prisma.user.findFirst({
        where: {
          email,
        }
      });
      if (existingUser) {
        reply.status(400).send({ error: 'User already exists' });
        return;
      }
      function generateApiKey(length: number = 32): string {
        return randomBytes(length).toString('hex').slice(0, length);
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
            apiKey: generateApiKey(),
          },
        });
        return createdUser;
      });
      reply.status(201).send(newUser);
    } catch (error) {
      handleError(error, request, reply);
    }
  });
  // POST /user/login
  fastify.post('/login', async function (request, reply) {
    const { email, password } = request.body as { email: string, password: string };
    try {
      const user = await fastify.prisma.user.findUnique({
        where: { email }
      });
      if (user && await bcrypt.compare(password, user.password)) {
        const token = fastify.jwt.sign({ id: user.id, email: user.email });
        reply.setCookie('token', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        reply.send({ message: 'Login successful' });
      } else {
        reply.status(401).send({ error: 'Invalid email or password' });
      }
    } catch (error) {
      handleError(error, request, reply);
    }
  });

  // POST /user/logout
  fastify.post('/logout', async function (request, reply) {
    try {
      reply.clearCookie('token', {
        path: '/'
      });
      reply.send({ message: 'Logout successful' });
    } catch (error) {
      reply.status(500).send({ error: 'Logout failed' });
    }
  });

  // GET /user/:id
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async function (request, reply) {
    const { id } = request.params as { id: string };
    const userToken = request.user as { id: number, email: string };
    if (Number(id) !== userToken.id) {
      return reply.status(403).send({ error: 'Forbidden: You can only view your own profile' });
    }
    try {
      const user = await fastify.prisma.user.findUnique({
        where: { id: Number(id) }
      });

      if (user) {
        reply.send(user);
      } else {
        reply.status(404).send({ error: 'User not found' });
      }
    } catch (error) {
      handleError(error, request, reply);
    }
  });

  //GET /user/
  fastify.get('/', { preHandler: [fastify.authenticate] }, async function (request, reply) {
    const userToken = request.user as { id: number, email: string };
    try {
      const profile = await fastify.prisma.profile.findUnique({
        where: { userId: userToken.id },
      });
      if (profile && profile.role === 'ADMIN') {
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
        const result = users.map(user => ({
          id: user.id,
          email: user.email,
          role: user.profile?.role,
          type: user.profile?.type,
        }));
        reply.send(result);
      } else {
        reply.status(403).send({ error: 'Access denied' });
      }
    } catch (error){
      handleError(error, request, reply);
    }
  });

}

export default user;