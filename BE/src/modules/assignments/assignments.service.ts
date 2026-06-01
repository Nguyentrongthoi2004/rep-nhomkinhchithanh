import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { activityLogsService } from "@/modules/activity-logs/activity-logs.service";
import { isTerminalOrderState } from "@/modules/orders/orders.service";
import type { CreateAssignmentDto, UpdateAssignmentDto } from "./assignments.schema";

const SELECT = `
  mapc,
  trangthai,
  lydotuchoi,
  tuchoiluc,
  donhang:madh (
    madh,
    ngaytao,
    trangthai,
    khachhang:makh ( hoten ),
    chitietdh (
      mactdh,
      mota,
      chieudaicat,
      soluong,
      vattu:mavt ( tenvt, donvitinh )
    )
  ),
  nguoidung:matho ( mand, hoten, tendangnhap, trangthai, vaitro )
`;

type BusyAssignmentRow = {
  mapc: number;
  madh: number;
  trangthai: string;
  donhang?: { madh?: number } | null;
};

export const assignmentsService = {
  // Kiểm tra thợ có đang bận phân công khác không (trạng thái CHO_THUC_HIEN hoặc DANG_THUC_HIEN)
  async getBusyAssignmentForWorker(matho: number, excludeMapc?: number) {
    let q = supabaseAdmin
      .from("phancong")
      .select("mapc, madh, trangthai")
      .eq("matho", matho)
      .in("trangthai", ["CHO_THUC_HIEN", "DANG_THUC_HIEN"])
      .order("mapc", { ascending: false })
      .limit(1);

    if (excludeMapc !== undefined) q = q.neq("mapc", excludeMapc);

    const { data, error } = await q.maybeSingle();
    if (error) throw HttpError.internal(error.message);
    return (data ?? null) as BusyAssignmentRow | null;
  },

  async list() {
    const { data, error } = await supabaseAdmin.from("phancong").select(SELECT).order("mapc", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  // Phân công thợ cho đơn hàng: kiểm tra đơn đã duyệt giá, thợ là WORKER đang làm việc, thợ không bận
  async create(dto: CreateAssignmentDto, actorId?: number) {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai")
      .eq("madh", dto.madh)
      .maybeSingle();
    if (orderErr) throw HttpError.internal(orderErr.message);
    if (!order) throw HttpError.notFound("Không tìm thấy đơn hàng");
    if (isTerminalOrderState(order.trangthai as string)) {
      throw HttpError.badRequest("Đơn hàng đã hoàn thành hoặc đã hủy, không thể phân công");
    }
    if (["KHAO_SAT", "BAO_GIA_NHAP"].includes(order.trangthai as string)) {
      throw HttpError.badRequest("Cần duyệt giá đơn hàng trước khi phân công thợ");
    }
    if (order.trangthai === "DA_HUY") throw HttpError.badRequest("Không thể phân công đơn đã hủy");

    // Kiểm tra xem đơn hàng đã được phân công cho thợ khác chưa
    const { data: existingAssigns, error: assignErr } = await supabaseAdmin
      .from("phancong")
      .select("mapc, matho, trangthai, nguoidung:matho(hoten)")
      .eq("madh", dto.madh)
      .in("trangthai", ["CHO_THUC_HIEN", "DANG_THUC_HIEN", "HOAN_THANH"]);
    if (assignErr) throw HttpError.internal(assignErr.message);
    if (existingAssigns && existingAssigns.length > 0) {
      interface ExistingAssignmentRow {
        mapc: number;
        matho: number;
        trangthai: string;
        nguoidung: { hoten: string } | null;
      }
      const typedAssign = existingAssigns[0] as unknown as ExistingAssignmentRow;
      const workerName = typedAssign.nguoidung?.hoten || `Worker ${typedAssign.matho}`;
      throw HttpError.badRequest(
        `Đơn hàng này đã được phân công cho ${workerName} (PC-${typedAssign.mapc}, trạng thái: ${typedAssign.trangthai})`,
      );
    }

    const { data: worker, error: workerErr } = await supabaseAdmin
      .from("nguoidung")
      .select("mand, vaitro, trangthai")
      .eq("mand", dto.matho)
      .single();
    if (workerErr || !worker) throw HttpError.notFound("Không tìm thấy thợ");
    if (worker.vaitro !== "WORKER") throw HttpError.badRequest("Chỉ phân công cho WORKER");
    if (worker.trangthai !== "DANG_LAM") throw HttpError.badRequest("Thợ đang bị khóa/nghỉ việc");

    const busy = await this.getBusyAssignmentForWorker(dto.matho);
    if (busy) {
      throw HttpError.badRequest(
        `Thợ đang bận phân công khác (PC-${busy.mapc} / DH-${busy.madh}, trạng thái: ${busy.trangthai})`,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("phancong")
      .insert({ madh: dto.madh, matho: dto.matho, trangthai: "CHO_THUC_HIEN" })
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    void activityLogsService.record({
      userId: actorId ?? null,
      action: "ASSIGNMENT_CREATED",
      targetType: "phancong",
      targetId: data.mapc as number,
      details: { madh: dto.madh, matho: dto.matho },
    });
    return data;
  },

  // Cập nhật trạng thái phân công: nếu chuyển sang DANG_THUC_HIEN thì kiểm tra thợ không bận việc khác
  async update(id: number, dto: UpdateAssignmentDto) {
    const { data: current, error: curErr } = await supabaseAdmin
      .from("phancong")
      .select("mapc, matho, madh, donhang:madh(trangthai)")
      .eq("mapc", id)
      .maybeSingle();
    if (curErr) throw HttpError.internal(curErr.message);
    if (!current) throw HttpError.notFound(`Assignment ${id} not found`);

    interface CurrentAssignmentWithOrder {
      mapc: number;
      matho: number;
      madh: number;
      donhang: { trangthai: string } | null;
    }
    const typedCurrent = current as unknown as CurrentAssignmentWithOrder;
    const orderStatus = typedCurrent.donhang?.trangthai;
    if (orderStatus && isTerminalOrderState(orderStatus)) {
      throw HttpError.badRequest("Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể thay đổi phân công");
    }

    if (dto.trangthai === "DANG_THUC_HIEN") {
      const busy = await this.getBusyAssignmentForWorker(typedCurrent.matho, id);
      if (busy) {
        throw HttpError.badRequest(
          `Không thể chuyển sang ĐANG_THỰC_HIỆN vì thợ đang bận phân công khác (PC-${busy.mapc} / DH-${busy.madh}, trạng thái: ${busy.trangthai})`,
        );
      }
    }

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
    const { data: current, error: curErr } = await supabaseAdmin
      .from("phancong")
      .select("mapc, madh, donhang:madh(trangthai)")
      .eq("mapc", id)
      .maybeSingle();
    if (curErr) throw HttpError.internal(curErr.message);
    if (!current) throw HttpError.notFound(`Assignment ${id} not found`);

    interface AssignmentToRemove {
      donhang: { trangthai: string } | null;
    }
    const typed = current as unknown as AssignmentToRemove;
    if (typed.donhang?.trangthai && isTerminalOrderState(typed.donhang.trangthai)) {
      throw HttpError.badRequest("Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể xóa phân công");
    }

    const { error } = await supabaseAdmin.from("phancong").delete().eq("mapc", id);
    if (error) throw HttpError.internal(error.message);
  },
};
