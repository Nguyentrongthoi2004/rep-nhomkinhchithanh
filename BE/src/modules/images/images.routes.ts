import { Router, raw, type Request } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { HttpError, sendCreated, sendNoContent, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  assignmentImagesParamSchema,
  createOrderImageSchema,
  imageIdParamSchema,
  orderImagesParamSchema,
  replaceOrderImageFileSchema,
  stockImagesParamSchema,
  uploadOrderImageFileSchema,
  uploadOrderImageSchema,
  type CreateOrderImageDto,
  type ReplaceOrderImageFileDto,
  type UploadOrderImageFileDto,
  type UploadOrderImageDto,
} from "./images.schema";
import { imagesService } from "./images.service";

type MultipartUpload = {
  fields: Record<string, string>;
  file: { buffer: Buffer; mimeType: string };
};

const imageFileBody = raw({ type: "multipart/form-data", limit: "8mb" });

function parseMultipartUpload(req: Request): MultipartUpload {
  const contentTypeHeader = req.headers["content-type"];
  const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? "")?.slice(1).find(Boolean);
  if (!boundary) throw HttpError.badRequest("Thieu boundary cua file upload");
  if (!Buffer.isBuffer(req.body)) throw HttpError.badRequest("Du lieu upload khong hop le");

  const body = req.body;
  const delimiter = Buffer.from(`--${boundary}`);
  const fields: Record<string, string> = {};
  let imageFile: MultipartUpload["file"] | null = null;
  let cursor = body.indexOf(delimiter);

  while (cursor >= 0) {
    cursor += delimiter.length;
    if (body[cursor] === 45 && body[cursor + 1] === 45) break;
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2;

    const next = body.indexOf(delimiter, cursor);
    if (next < 0) break;

    let end = next;
    if (end >= 2 && body[end - 2] === 13 && body[end - 1] === 10) end -= 2;

    const part = body.subarray(cursor, end);
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd > 0) {
      const headerText = part.subarray(0, headerEnd).toString("utf8");
      const content = part.subarray(headerEnd + 4);
      const headers = new Map<string, string>();

      for (const line of headerText.split("\r\n")) {
        const separator = line.indexOf(":");
        if (separator > 0) headers.set(line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim());
      }

      const disposition = headers.get("content-disposition") ?? "";
      const name = /(?:^|;)\s*name="([^"]+)"/.exec(disposition)?.[1];
      const filename = /(?:^|;)\s*filename="([^"]*)"/.exec(disposition)?.[1];
      if (name) {
        if (filename !== undefined) {
          imageFile = {
            buffer: content,
            mimeType: headers.get("content-type") ?? "application/octet-stream",
          };
        } else {
          fields[name] = content.toString("utf8");
        }
      }
    }

    cursor = next;
  }

  if (!imageFile) throw HttpError.badRequest("Chua co file anh can upload");
  return { fields, file: imageFile };
}

function parseUploadFileDto(fields: Record<string, string>): UploadOrderImageFileDto {
  const parsed = uploadOrderImageFileSchema.safeParse(fields);
  if (!parsed.success) throw HttpError.badRequest("Thong tin anh khong hop le", parsed.error.flatten());
  return parsed.data;
}

function parseReplaceFileDto(fields: Record<string, string>): ReplaceOrderImageFileDto {
  const parsed = replaceOrderImageFileSchema.safeParse(fields);
  if (!parsed.success) throw HttpError.badRequest("Thong tin anh thay the khong hop le", parsed.error.flatten());
  return parsed.data;
}

export const imagesRouter = Router();
imagesRouter.use(authMiddleware, requireRole("ADMIN"));

imagesRouter.get(
  "/order/:madh",
  validate(orderImagesParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { madh } = req.params as unknown as { madh: number };
    sendOk(res, await imagesService.listByOrder(madh));
  }),
);

imagesRouter.get(
  "/stock/:maphoi",
  validate(stockImagesParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { maphoi } = req.params as unknown as { maphoi: number };
    sendOk(res, await imagesService.listByStock(maphoi));
  }),
);

imagesRouter.get(
  "/assignment/:mapc",
  validate(assignmentImagesParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { mapc } = req.params as unknown as { mapc: number };
    sendOk(res, await imagesService.listByAssignment(mapc, req.user?.mand, "ADMIN"));
  }),
);

imagesRouter.post(
  "/",
  validate(createOrderImageSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await imagesService.create(req.body as CreateOrderImageDto, req.user?.mand));
  }),
);

imagesRouter.post(
  "/upload",
  validate(uploadOrderImageSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await imagesService.upload(req.body as UploadOrderImageDto, req.user?.mand, "ADMIN"));
  }),
);

imagesRouter.post(
  "/upload-file",
  imageFileBody,
  asyncHandler(async (req, res) => {
    const upload = parseMultipartUpload(req);
    sendCreated(res, await imagesService.uploadFile(parseUploadFileDto(upload.fields), upload.file, req.user?.mand, "ADMIN"));
  }),
);

imagesRouter.patch(
  "/:id/file",
  validate(imageIdParamSchema, "params"),
  imageFileBody,
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const upload = parseMultipartUpload(req);
    sendOk(res, await imagesService.replaceFile(id, parseReplaceFileDto(upload.fields), upload.file, req.user?.mand));
  }),
);

imagesRouter.delete(
  "/:id",
  validate(imageIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    await imagesService.remove(id);
    sendNoContent(res);
  }),
);

export const workerImagesRouter = Router();
workerImagesRouter.use(authMiddleware, requireRole("WORKER", "ADMIN"));

workerImagesRouter.get(
  "/assignment/:mapc",
  validate(assignmentImagesParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { mapc } = req.params as unknown as { mapc: number };
    sendOk(res, await imagesService.listByAssignment(mapc, req.user?.mand, "WORKER"));
  }),
);

workerImagesRouter.post(
  "/upload",
  validate(uploadOrderImageSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await imagesService.upload(req.body as UploadOrderImageDto, req.user?.mand, "WORKER"));
  }),
);

workerImagesRouter.post(
  "/upload-file",
  imageFileBody,
  asyncHandler(async (req, res) => {
    const upload = parseMultipartUpload(req);
    sendCreated(res, await imagesService.uploadFile(parseUploadFileDto(upload.fields), upload.file, req.user?.mand, "WORKER"));
  }),
);
