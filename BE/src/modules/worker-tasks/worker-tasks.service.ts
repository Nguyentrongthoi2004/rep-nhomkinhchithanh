import { supabaseAdmin } from "@/lib/supabase";
import { HttpError } from "@/lib/http";
import { notificationsService } from "@/modules/notifications/notifications.service";
import type { RejectTaskDto, UpdateTaskDto } from "./worker-tasks.schema";

const TABLE = "phancong";

const SELECT = `
  mapc,
  trangthai,
  lydotuchoi,
  tuchoiluc,
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

const REJECT_REASON_LABEL: Record<string, string> = {
  DANG_BAN: "Đang bận việc khác",
  KHONG_PHU_HOP_TAY_NGHE: "Không phù hợp tay nghề",
  KHONG_THUAN_TIEN_THAO_TAC: "Không thuận tiện thao tác",
  THIEU_THONG_TIN_SO_DO_CAT: "Thiếu thông tin/sơ đồ cắt",
  LY_DO_KHAC: "Lý do khác",
};

export const workerTasksService = {
  async listForWorker(matho: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("matho", matho)
      .in("trangthai", ["CHO_THUC_HIEN", "DANG_THUC_HIEN", "HOAN_THANH"])
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
    const current = await this.getForWorker(mapc, matho) as { trangthai?: string };
    if (current.trangthai === "TU_CHOI") throw HttpError.badRequest("Nhiệm vụ đã bị từ chối");

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ trangthai: dto.trangthai })
      .eq("mapc", mapc)
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  async reject(mapc: number, matho: number, dto: RejectTaskDto) {
    const current = await this.getForWorker(mapc, matho) as {
      mapc: number;
      madh: number;
      trangthai: string;
      donhang?: { khachhang?: { hoten?: string | null } | null } | null;
    };
    if (current.trangthai === "HOAN_THANH") {
      throw HttpError.badRequest("Không thể từ chối nhiệm vụ đã hoàn thành");
    }
    if (current.trangthai === "TU_CHOI") {
      throw HttpError.badRequest("Nhiệm vụ đã được từ chối trước đó");
    }

    const reasonLabel = REJECT_REASON_LABEL[dto.lydo] ?? dto.lydo;
    const note = dto.ghichu?.trim();
    const reasonText = note ? `${reasonLabel}: ${note}` : reasonLabel;

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        trangthai: "TU_CHOI",
        lydotuchoi: reasonText,
        tuchoiluc: new Date().toISOString(),
      })
      .eq("mapc", mapc)
      .eq("matho", matho)
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);

    void notificationsService
      .createForAdmins({
        title: `Worker từ chối PC-${mapc}`,
        body: `Phân công PC-${mapc} / DH-${current.madh} bị từ chối. Lý do: ${reasonText}.`,
        type: "phan_cong",
        href: "/admin/phan-cong",
        data: {
          doi_tuong: "phancong",
          ma_doi_tuong: mapc,
          madh: current.madh,
          lydo: dto.lydo,
        },
      })
      .catch(() => null);

    return data;
  },
};
