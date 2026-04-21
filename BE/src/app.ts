import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "@/config/env";
import { apiRouter } from "@/routes";
import { errorHandler, notFound } from "@/middlewares/error";
import { requestContext } from "@/middlewares/requestContext";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow non-browser tools (no Origin header) and whitelisted origins
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
