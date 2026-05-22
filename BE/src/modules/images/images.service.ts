import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/config/env";
import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { CreateOrderImageDto, UploadOrderImageDto, UploadOrderImageFileDto } from "./images.schema";

const TABLE = "hinhanh";
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "order-images");
const STORAGE_FOLDER = "order-images";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const SELECT = `
  maha,
  madh,
  duongdan,
  mota,
  loaianh,
  mapc,
  masdc,
  maphoi,
  thoigian,
  nguoichup,
  nguoidung:nguoichup ( hoten )
`;

type Role = "ADMIN" | "WORKER";
type AssignmentRow = { mapc: number; madh: number; matho: number | null };
type PlanRow = { masdc: number; mapc: number; maphoi: number | null };
type UploadContextDto = Pick<UploadOrderImageDto, "madh" | "mapc" | "masdc" | "maphoi" | "loaianh">;
type UploadedImageFile = { buffer: Buffer; mimeType: string };
type ImageContext = {
  madh: number;
  mapc: number | null;
  masdc: number | null;
  maphoi: number | null;
};

function imageExtensionFromMime(mimeType: string) {
  const mime = mimeType.toLowerCase().split(";")[0]?.trim();
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  throw HttpError.badRequest("Chi chap nhan anh JPG, PNG hoac WEBP");
}

function ensureImageSize(buffer: Buffer) {
  if (buffer.length <= 0) throw HttpError.badRequest("File anh rong");
  if (buffer.length > MAX_IMAGE_BYTES) throw HttpError.badRequest("Anh qua lon, vui long chup/nen anh nho hon 6MB");
}

function parseImageDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw HttpError.badRequest("Chi chap nhan anh JPG, PNG hoac WEBP");

  const buffer = Buffer.from(match[2], "base64");
  ensureImageSize(buffer);
  const ext = imageExtensionFromMime(match[1]);
  return { buffer, ext, mimeType: match[1] };
}

async function getAssignment(mapc: number) {
  const { data, error } = await supabaseAdmin
    .from("phancong")
    .select("mapc, madh, matho")
    .eq("mapc", mapc)
    .maybeSingle();
  if (error) throw HttpError.internal(error.message);
  if (!data) throw HttpError.notFound(`Phan cong PC-${mapc} khong ton tai`);
  return data as AssignmentRow;
}

async function getPlan(masdc: number) {
  const { data, error } = await supabaseAdmin
    .from("sodocat")
    .select("masdc, mapc, maphoi")
    .eq("masdc", masdc)
    .maybeSingle();
  if (error) throw HttpError.internal(error.message);
  if (!data) throw HttpError.notFound(`So do cat SDC-${masdc} khong ton tai`);
  return data as PlanRow;
}

async function ensureOrder(madh: number) {
  const { data, error } = await supabaseAdmin.from("donhang").select("madh").eq("madh", madh).maybeSingle();
  if (error) throw HttpError.internal(error.message);
  if (!data) throw HttpError.notFound(`Don hang DH-${madh} khong ton tai`);
}

async function resolveContext(dto: UploadContextDto, userId: number | undefined, role: Role): Promise<ImageContext> {
  let mapc = dto.mapc ?? null;
  const masdc = dto.masdc ?? null;
  let maphoi = dto.maphoi ?? null;
  let madh = dto.madh ?? null;

  if (dto.loaianh === "CAT_PHOI" && !masdc) {
    throw HttpError.badRequest("Anh xac nhan cat phoi can gan voi ma so do cat");
  }

  if (masdc) {
    const plan = await getPlan(masdc);
    mapc = plan.mapc;
    maphoi = plan.maphoi ?? maphoi;
  }

  if (mapc) {
    const assignment = await getAssignment(mapc);
    madh = assignment.madh;
    if (role === "WORKER" && assignment.matho !== userId) {
      throw HttpError.forbidden("Khong duoc upload anh cho phan cong cua tho khac");
    }
  } else if (madh) {
    await ensureOrder(madh);
    if (role === "WORKER") {
      const { data, error } = await supabaseAdmin
        .from("phancong")
        .select("mapc")
        .eq("madh", madh)
        .eq("matho", userId)
        .limit(1);
      if (error) throw HttpError.internal(error.message);
      if (!data?.length) throw HttpError.forbidden("Khong duoc upload anh cho don hang chua duoc phan cong");
    }
  }

  if (!madh) throw HttpError.badRequest("Can co ma don hang hoac ma phan cong hop le");
  return { madh, mapc, masdc, maphoi };
}

async function saveDataUrl(dataUrl: string) {
  const { buffer, ext, mimeType } = parseImageDataUrl(dataUrl);
  return saveImageBuffer(buffer, ext, mimeType);
}

async function saveImageBuffer(buffer: Buffer, ext: string, mimeType: string) {
  ensureImageSize(buffer);
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const storagePath = `${STORAGE_FOLDER}/${fileName}`;
  const { error: storageError } = await supabaseAdmin.storage
    .from(env.SUPABASE_IMAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (!storageError) {
    const { data } = supabaseAdmin.storage.from(env.SUPABASE_IMAGE_BUCKET).getPublicUrl(storagePath);
    if (data.publicUrl) return data.publicUrl;
  } else {
    console.warn(
      `[images] Supabase Storage upload failed, falling back to local file: ${storageError.message}`,
    );
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), buffer);
  return `/uploads/order-images/${fileName}`;
}

export const imagesService = {
  async listByOrder(madh: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("madh", madh)
      .order("thoigian", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async listByStock(maphoi: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("maphoi", maphoi)
      .order("thoigian", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async create(dto: CreateOrderImageDto, userId?: number) {
    await ensureOrder(dto.madh);

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        madh: dto.madh,
        duongdan: dto.duongdan,
        mota: dto.mota?.trim() || null,
        loaianh: dto.loaianh ?? "KHAC",
        mapc: dto.mapc ?? null,
        masdc: dto.masdc ?? null,
        maphoi: dto.maphoi ?? null,
        nguoichup: userId ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  async upload(dto: UploadOrderImageDto, userId: number | undefined, role: Role) {
    const context = await resolveContext(dto, userId, role);
    const publicPath = await saveDataUrl(dto.dataUrl);

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        madh: context.madh,
        duongdan: publicPath,
        mota: dto.mota?.trim() || null,
        loaianh: dto.loaianh,
        mapc: context.mapc,
        masdc: context.masdc,
        maphoi: context.maphoi,
        nguoichup: userId ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  async uploadFile(dto: UploadOrderImageFileDto, file: UploadedImageFile, userId: number | undefined, role: Role) {
    const context = await resolveContext(dto, userId, role);
    const publicPath = await saveImageBuffer(file.buffer, imageExtensionFromMime(file.mimeType), file.mimeType);

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        madh: context.madh,
        duongdan: publicPath,
        mota: dto.mota?.trim() || null,
        loaianh: dto.loaianh,
        mapc: context.mapc,
        masdc: context.masdc,
        maphoi: context.maphoi,
        nguoichup: userId ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  async remove(id: number) {
    const { error } = await supabaseAdmin.from(TABLE).delete().eq("maha", id);
    if (error) throw HttpError.internal(error.message);
  },
};
