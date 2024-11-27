import fp from "fastify-plugin";
import cors, { FastifyCorsOptions } from "@fastify/cors";

/**
 * CORS configuration plugin with different policies for API and non-API routes
 * - Open access for all /api/ routes
 * - Restricted access for non-API routes
 */
export default fp<FastifyCorsOptions>(async (fastify) => {
  // Lấy environment variables
  const NODE_ENV = process.env.NODE_ENV || "development";
  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .filter(Boolean);

  // Cấu hình origins cho non-API routes
  const corsOrigins =
    NODE_ENV === "development"
      ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", ...ALLOWED_ORIGINS]
      : ALLOWED_ORIGINS;

  // Danh sách routes không cần kiểm tra CORS
  const PUBLIC_ROUTES = ["/docs"];

  fastify.register(cors, {
    origin: (origin, callback) => {
      const url = fastify.prefix || "";

      // Nếu là API route, cho phép tất cả origins
      if (url.startsWith("/api/")) {
        callback(null, true);
        return;
      }

      // Cho phép requests không có origin (như mobile apps hoặc Postman)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Cho phép tất cả origins trong development
      if (NODE_ENV === "development") {
        callback(null, true);
        return;
      }

      // Kiểm tra origin có được phép trong production cho non-API routes
      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Từ chối các origin khác trong production
      callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-API-Key",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range", "X-Total-Count"],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
  });

  // Add hook to handle CORS headers
  fastify.addHook("preHandler", async (request, reply) => {
    const url = request.raw.url;

    // Xử lý OPTIONS requests
    if (request.method === "OPTIONS") {
      if (url?.startsWith("/api/")) {
        // Cho API routes: Allow all
        reply.header("Access-Control-Allow-Origin", "*");
        reply.header(
          "Access-Control-Allow-Methods",
          "GET,POST,PUT,DELETE,PATCH,OPTIONS"
        );
        reply.header(
          "Access-Control-Allow-Headers",
          "X-API-Key,Content-Type,Authorization"
        );
      } else if (
        PUBLIC_ROUTES.some((route) => url?.startsWith(route)) ||
        url === "/" ||
        url === "/api/"
      ) {
        // Cho public routes: Allow all
        reply.header("Access-Control-Allow-Origin", "*");
      } else {
        // Cho các routes khác: Kiểm tra origin
        const origin = request.headers.origin;
        if (NODE_ENV === "development" || corsOrigins.includes(origin || "")) {
          reply.header("Access-Control-Allow-Origin", origin);
        }
      }
      // Không gửi trả về ngay, chỉ cần trả về các headers và để Fastify xử lý tiếp
      return; // Kết thúc tại đây, không tiếp tục qua các hook tiếp theo
    }

    // Thêm CORS headers cho non-OPTIONS requests
    if (url?.startsWith("/api/")) {
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,PATCH,OPTIONS"
      );
      reply.header(
        "Access-Control-Allow-Headers",
        "X-API-Key,Content-Type,Authorization"
      );
    } else if (
      url?.startsWith("/user/signup") ||
      url?.startsWith("/user/login")
    ) {
      const origin = request.headers.origin;
      if (NODE_ENV === "development" || corsOrigins.includes(origin || "")) {
        reply.header("Access-Control-Allow-Origin", origin);
      }
    }
  });
});
