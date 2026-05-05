import { supabaseAdmin } from "@/lib/supabase";
import { HttpError } from "@/lib/http";
import type { UpdateTaskDto } from "./worker-tasks.schema";

const TABLE = "phancong";

const SELECT = `
  mapc,
  trangthai,
  matho,
  madh,
  donhang:madh(
    madh,
    ngaytao,
    trangthai,
    khachhang:makh(hoten),
    chitietdh(mactdh, mota, chieudaicat, soluong, vattu:mavt(tenvt, donvitinh))
  )
`;

export const workerTasksService = {
  async listForWorker(matho: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("matho", matho)
      .order("mapc", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async getForWorker(mapc: number, matho: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("mapc", mapc)
      .eq("matho", matho)
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!data) throw HttpError.notFound(`Task ${mapc} not found or not assigned to you`);
    return data;
  },

  async updateStatus(mapc: number, matho: number, dto: UpdateTaskDto) {
    // Ensure the task belongs to this worker
    await this.getForWorker(mapc, matho);

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ trangthai: dto.trangthai })
      .eq("mapc", mapc)
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    return data;
  },
};
