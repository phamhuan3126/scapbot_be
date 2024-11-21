import { FastifyPluginAsync } from "fastify";
import imaps from 'imap-simple';

const verify: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  //Check App Password
  fastify.post('/check-app-password', async (request, reply) => {
    const { email, appPassword } = request.body as {
      email: string;
      appPassword: string;
    };
    if (!email || !appPassword) {
      return reply.status(400).send({ success: false, message: 'Email and App Password are required.' });
    }
    const imapConfig = {
      imap: {
        user: email,
        password: appPassword,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 3000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    try {
      const connection = await imaps.connect(imapConfig);
      await connection.openBox('INBOX');
      return reply.send({ success: true, message: 'App Password is valid.' });
    } catch (error) {
      const err = error as Error;
      return reply.send({ success: false, message: `Invalid App Password: ${err.message}` });
    }
  });

}

export default verify;
