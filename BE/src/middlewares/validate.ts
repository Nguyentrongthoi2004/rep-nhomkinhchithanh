import type { RequestHandler } from "express";
import { z, ZodTypeAny } from "zod";
import { HttpError } from "@/lib/http";

type Source = "body" | "query" | "params";

/**
 * Validates a part of the request with a Zod schema. Replaces the source
 * with the parsed value so downstream handlers get typed data.
 */
export function validate<S extends ZodTypeAny>(schema: S, source: Source = "body"): RequestHandler {
  return (req, _res, next) => {
    const raw = req[source];
    const result = schema.safeParse(raw);
    if (!result.success) {
      return next(
        HttpError.badRequest(
          `Invalid ${source}`,
          result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        ),
      );
    }
    // Narrow types for downstream
    (req as unknown as Record<Source, z.infer<S>>)[source] = result.data;
    next();
  };
}
