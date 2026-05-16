import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { CreateCustomerDto, UpdateCustomerDto } from "./customers.schema";

const TABLE = "khachhang";
const SELECT = `
  makh,
  hoten,
  sdt,
  email,
  diachi,
  donhang (
    madh,
    ngaytao,
    trangthai,
    tonggiatri
  )
`;

const FLAT_SELECT = "makh, hoten, sdt, email, diachi";

export const customersService = {
  async list() {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .order("makh", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async getById(id: number) {
    const { data, error } = await supabaseAdmin.from(TABLE).select(SELECT).eq("makh", id).maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!data) throw HttpError.notFound(`Customer ${id} not found`);
    return data;
  },

  async create(dto: CreateCustomerDto) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({ hoten: dto.hoten, sdt: dto.sdt, email: dto.email ?? null, diachi: dto.diachi ?? null })
      .select(FLAT_SELECT)
      .single();
    if (error) {
      if (error.code === "23505") throw HttpError.conflict("So dien thoai khach hang da ton tai");
      throw HttpError.internal(error.message);
    }
    return data;
  },

  async update(id: number, dto: UpdateCustomerDto) {
    const payload: Record<string, unknown> = {};
    if (dto.hoten !== undefined) payload.hoten = dto.hoten;
    if (dto.sdt !== undefined) payload.sdt = dto.sdt;
    if (dto.email !== undefined) payload.email = dto.email ?? null;
    if (dto.diachi !== undefined) payload.diachi = dto.diachi;

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(payload)
      .eq("makh", id)
      .select(FLAT_SELECT)
      .single();
    if (error) {
      if (error.code === "23505") throw HttpError.conflict("So dien thoai khach hang da ton tai");
      if (error.code === "PGRST116") throw HttpError.notFound(`Customer ${id} not found`);
      throw HttpError.internal(error.message);
    }
    return data;
  },

  async remove(id: number) {
    const { error } = await supabaseAdmin.from(TABLE).delete().eq("makh", id);
    if (error) {
      if (error.code === "23503") {
        throw HttpError.conflict("Khach hang da co don hang, khong the xoa");
      }
      throw HttpError.internal(error.message);
    }
  },
};
