import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { CreateAssignmentDto, UpdateAssignmentDto } from "./assignments.schema";

const SELECT = `
  mapc,
  trangthai,
  donhang:madh ( madh, ngaytao, trangthai, khachhang:makh ( hoten ) ),
  nguoidung:matho ( mand, hoten, tendangnhap, trangthai, vaitro )
`;

export const assignmentsService = {
  async list() {
    const { data, error } = await supabaseAdmin.from("phancong").select(SELECT).order("mapc", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async create(dto: CreateAssignmentDto) {
    const { data: worker, error: workerErr } = await supabaseAdmin
      .from("nguoidung")
      .select("mand, vaitro, trangthai")
      .eq("mand", dto.matho)
      .single();
    if (workerErr || !worker) throw HttpError.notFound("Không tìm thấy thợ");
    if (worker.vaitro !== "WORKER") throw HttpError.badRequest("Chỉ phân công cho WORKER");
    if (worker.trangthai !== "DANG_LAM") throw HttpError.badRequest("Thợ đang bị khóa/nghỉ việc");

    const { data, error } = await supabaseAdmin
      .from("phancong")
      .insert({ madh: dto.madh, matho: dto.matho, trangthai: "CHO_THUC_HIEN" })
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  async update(id: number, dto: UpdateAssignmentDto) {
    const { data, error } = await supabaseAdmin
      .from("phancong")
      .update({ trangthai: dto.trangthai })
      .eq("mapc", id)
      .select(SELECT)
      .single();
    if (error) {
      if (error.code === "PGRST116") throw HttpError.notFound(`Assignment ${id} not found`);
      throw HttpError.internal(error.message);
    }
    return data;
  },

  async remove(id: number) {
    const { error } = await supabaseAdmin.from("phancong").delete().eq("mapc", id);
    if (error) throw HttpError.internal(error.message);
  },
};
