import express, { type Express } from "express";
// force reload trigger: 1
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
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

  // Worker có thể chụp ảnh bằng camera; frontend đã nén ảnh trước khi gửi,
  // nhưng vẫn cần giới hạn JSON rộng hơn mức mặc định để nhận data URL an toàn.
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Ảnh upload nội bộ được phục vụ tĩnh qua /uploads để frontend dùng trực tiếp trong thẻ img.
  // Helmet mặc định chặn cross-origin resource; FE chạy ở :3000 còn BE ở :4000 nên cần mở riêng cho ảnh.
  app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), "uploads"), {
      setHeaders: (res) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "*");
      },
    }),
  );

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
