import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "@/config/env";
import { apiRouter } from "@/routes";
import { errorHandler, notFound } from "@/middlewares/error";
import { requestContext } from "@/middlewares/requestContext";

// Khởi tạo máy chủ Express với các tầng xử lý: CORS, Helmet bảo mật, bộ phân tích JSON, ghi nhật ký yêu cầu.
// Tất cả API được gắn tại tiền tố /api (xem routes/index.ts).
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Cho phép công cụ không phải trình duyệt (không có Origin) và các origin trong danh sách cho phép.
        if (!origin) return cb(null, true);
        if (env.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} is not allowed`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(requestContext);
  if (env.NODE_ENV !== "test") {
    app.use(
      morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
        skip: (req) => req.url === "/api/health",
      }),
    );
  }

  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "mini-erp-be", version: "0.1.0" });
  });

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
