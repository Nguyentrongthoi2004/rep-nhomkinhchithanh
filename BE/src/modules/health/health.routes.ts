import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { env } from "@/config/env";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  sendOk(res, {
    service: "mini-erp-be",
    env: env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

healthRouter.get(
  "/db",
  asyncHandler(async (_req, res) => {
    const t0 = Date.now();
    const { error } = await supabaseAdmin.from("danhmuc").select("madm", { count: "exact", head: true });
    const ms = Date.now() - t0;
    if (error) {
      return sendOk(
        res,
        { supabase: "down", latencyMs: ms, error: error.message },
        503,
      );
    }
    sendOk(res, { supabase: "up", latencyMs: ms });
  }),
);
