import { randomUUID } from "node:crypto";
import { env } from "@/config/env";
import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { isTerminalOrderState } from "@/modules/orders/orders.service";
import type { CreateOrderImageDto, ReplaceOrderImageFileDto, UploadOrderImageDto, UploadOrderImageFileDto } from "./images.schema";

const TABLE = "hinhanh";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 600;
const STORAGE_UPLOAD_ERROR = "Supabase image bucket chưa được cấu hình hoặc chưa tồn tại.";

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
type ImageType = "CAT_PHOI" | "HOAN_THANH_CONG_TRINH" | "BAO_CAO_SU_CO" | "KHAC";
type ImageContext = {
  madh: number;
  mapc: number | null;
  masdc: number | null;
  maphoi: number | null;
};
type ImageRow = {
  maha: number;
  madh: number;
  duongdan: string | null;
  mota: string | null;
  loaianh: ImageType | null;
  mapc: number | null;
  masdc: number | null;
  maphoi: number | null;
  thoigian: string | null;
  nguoichup: number | null;
  nguoidung?: { hoten?: string | null } | null;
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

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("donhang")
    .select("trangthai")
    .eq("madh", madh)
    .maybeSingle();
  if (orderErr) throw HttpError.internal(orderErr.message);
  if (order && isTerminalOrderState(order.trangthai as string)) {
    throw HttpError.badRequest("Đơn hàng đã hoàn thành hoặc đã hủy, không thể tải lên hình ảnh");
  }

  return { madh, mapc, masdc, maphoi };
}

function isFullUrl(path: string) {
  return /^https?:\/\//i.test(path);
}

function isLegacyLocalPath(path: string) {
  return /^\/?uploads\//i.test(path);
}

function normalizeLegacyLocalPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function isStoragePath(path: string | null | undefined): path is string {
  if (!path) return false;
  return !isFullUrl(path) && !isLegacyLocalPath(path);
}

function storageSegment(value: number | string | null | undefined, fallback = "unknown") {
  const raw = value == null || value === "" ? fallback : String(value);
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function storageFolderFor(type: ImageType, context: ImageContext) {
  if (type === "CAT_PHOI") {
    return `cutting/${storageSegment(context.mapc)}/${storageSegment(context.masdc)}/${storageSegment(context.maphoi)}`;
  }
  if (type === "HOAN_THANH_CONG_TRINH") {
    return `completion/${storageSegment(context.mapc)}`;
  }
  if (type === "BAO_CAO_SU_CO") {
    return `incident/${storageSegment(context.mapc)}`;
  }
  return `other/${storageSegment(context.madh)}`;
}

async function withViewUrl<T extends ImageRow>(row: T): Promise<T & { url: string | null }> {
  const path = row.duongdan?.trim();
  if (!path) return { ...row, url: null };
  if (isFullUrl(path)) return { ...row, url: path };
  if (isLegacyLocalPath(path)) return { ...row, url: normalizeLegacyLocalPath(path) };

  const { data, error } = await supabaseAdmin.storage
    .from(env.SUPABASE_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.warn(`[images] Cannot create signed URL for ${path}: ${error.message}`);
    return { ...row, url: null };
  }
  return { ...row, url: data?.signedUrl ?? null };
}

async function withViewUrls<T extends ImageRow>(rows: T[] | null | undefined) {
  return Promise.all((rows ?? []).map((row) => withViewUrl(row)));
}

async function saveDataUrl(dataUrl: string, context: ImageContext, type: ImageType) {
  const { buffer, ext, mimeType } = parseImageDataUrl(dataUrl);
  return saveImageBuffer(buffer, ext, mimeType, context, type);
}

async function saveImageBuffer(buffer: Buffer, ext: string, mimeType: string, context: ImageContext, type: ImageType) {
  ensureImageSize(buffer);
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const storagePath = `${storageFolderFor(type, context)}/${fileName}`;
  const { error: storageError } = await supabaseAdmin.storage
    .from(env.SUPABASE_IMAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (storageError) {
    throw HttpError.internal(`${STORAGE_UPLOAD_ERROR} ${storageError.message}`);
  }

  return storagePath;
}

async function removeStoragePath(path: string) {
  const { error } = await supabaseAdmin.storage.from(env.SUPABASE_IMAGE_BUCKET).remove([path]);
  if (error) throw HttpError.internal(`Khong xoa duoc file anh tren Supabase Storage: ${error.message}`);
}

export const imagesService = {
  async listByOrder(madh: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("madh", madh)
      .order("thoigian", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return withViewUrls(data as ImageRow[] | null);
  },

  async listByStock(maphoi: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("maphoi", maphoi)
      .order("thoigian", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return withViewUrls(data as ImageRow[] | null);
  },

  async listByAssignment(mapc: number, userId: number | undefined, role: Role) {
    const assignment = await getAssignment(mapc);
    if (role === "WORKER" && assignment.matho !== userId) {
      throw HttpError.forbidden("Khong duoc xem anh cua phan cong cua tho khac");
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("mapc", mapc)
      .order("thoigian", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return withViewUrls(data as ImageRow[] | null);
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
    return withViewUrl(data as ImageRow);
  },

  async upload(dto: UploadOrderImageDto, userId: number | undefined, role: Role) {
    const context = await resolveContext(dto, userId, role);
    const storagePath = await saveDataUrl(dto.dataUrl, context, dto.loaianh);

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        madh: context.madh,
        duongdan: storagePath,
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
    return withViewUrl(data as ImageRow);
  },

  async uploadFile(dto: UploadOrderImageFileDto, file: UploadedImageFile, userId: number | undefined, role: Role) {
    const context = await resolveContext(dto, userId, role);
    const storagePath = await saveImageBuffer(file.buffer, imageExtensionFromMime(file.mimeType), file.mimeType, context, dto.loaianh);

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        madh: context.madh,
        duongdan: storagePath,
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
    return withViewUrl(data as ImageRow);
  },

  async replaceFile(id: number, dto: ReplaceOrderImageFileDto, file: UploadedImageFile, userId?: number) {
    const { data: existingData, error: readError } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("maha", id)
      .maybeSingle();
    if (readError) throw HttpError.internal(readError.message);
    if (!existingData) throw HttpError.notFound(`Anh ${id} khong ton tai`);

    const existing = existingData as ImageRow;
    const imageType = existing.loaianh ?? "KHAC";
    const context: ImageContext = {
      madh: existing.madh,
      mapc: existing.mapc,
      masdc: existing.masdc,
      maphoi: existing.maphoi,
    };
    const newPath = await saveImageBuffer(file.buffer, imageExtensionFromMime(file.mimeType), file.mimeType, context, imageType);
    const oldPath = existing.duongdan?.trim();

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        duongdan: newPath,
        mota: dto.mota === undefined ? existing.mota : dto.mota?.trim() || null,
        nguoichup: userId ?? existing.nguoichup,
        thoigian: new Date().toISOString(),
      })
      .eq("maha", id)
      .select(SELECT)
      .single();

    if (error) {
      try {
        await removeStoragePath(newPath);
      } catch (cleanupError) {
        console.warn(`[images] Cannot cleanup replacement upload ${newPath}:`, cleanupError);
      }
      throw HttpError.internal(error.message);
    }

    if (isStoragePath(oldPath)) {
      try {
        await removeStoragePath(oldPath);
      } catch (cleanupError) {
        console.warn(`[images] Cannot remove replaced storage image ${oldPath}:`, cleanupError);
      }
    }

    return withViewUrl(data as ImageRow);
  },

  async remove(id: number) {
    const { data, error: readError } = await supabaseAdmin
      .from(TABLE)
      .select("duongdan, madh, donhang:madh(trangthai)")
      .eq("maha", id)
      .maybeSingle();
    if (readError) throw HttpError.internal(readError.message);
    if (!data) throw HttpError.notFound("Không tìm thấy hình ảnh");

    interface ImageToRemove {
      duongdan?: string | null;
      madh?: number | null;
      donhang?: { trangthai: string } | null;
    }
    const typed = data as unknown as ImageToRemove;
    if (typed.donhang?.trangthai && isTerminalOrderState(typed.donhang.trangthai)) {
      throw HttpError.badRequest("Đơn hàng đã hoàn thành hoặc đã hủy, không thể xóa hình ảnh");
    }

    const path = typed.duongdan?.trim();
    if (isStoragePath(path)) {
      await removeStoragePath(path);
    }

    const { error } = await supabaseAdmin.from(TABLE).delete().eq("maha", id);
    if (error) throw HttpError.internal(error.message);
  },
};
