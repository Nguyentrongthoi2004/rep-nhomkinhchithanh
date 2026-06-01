import { z } from "zod";
import { firstQueryString } from "@/lib/zodQuery";

export const dashboardRangeValues = ["7d", "30d", "3m", "6m", "1y"] as const;
export type DashboardRange = (typeof dashboardRangeValues)[number];

export const dashboardRangeQuerySchema = z.object({
  range: z.preprocess((v) => {
    const s = firstQueryString(v)?.trim();
    return s?.length ? s : "30d";
  }, z.enum(dashboardRangeValues).default("30d")),
});

export type DashboardRangeQuery = z.infer<typeof dashboardRangeQuerySchema>;
