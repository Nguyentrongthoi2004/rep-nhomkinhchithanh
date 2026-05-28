import { createApp } from "@/app";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`MiniERP BE listening on http://localhost:${env.PORT}`, {
    env: env.NODE_ENV,
    cors: env.corsOrigins,
  });
});

function shutdown(signal: string) {
  logger.warn(`Received ${signal}, shutting down...`);
  server.close((err) => {
    if (err) {
      logger.error("Error during shutdown", { message: err.message });
      process.exit(1);
    }
    process.exit(0);
  });
  // Thoát cưỡng bức sau 10 giây nếu đóng máy chủ bị treo.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { message: err.message, stack: err.stack });
  shutdown("uncaughtException");
});
// Dummy comment to trigger tsx watch reload

