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
  async summaryForWorker(matho: number) {
    const [{ data: worker, error: workerError }, { data: tasks, error: taskError }, { count: issueCount, error: issueError }] =
      await Promise.all([
        supabaseAdmin
          .from("nguoidung")
          .select("mand, hoten, sdt, vaitro")
          .eq("mand", matho)
          .maybeSingle(),
        supabaseAdmin
          .from(TABLE)
          .select("mapc, madh, trangthai, donhang:madh(khachhang:makh(hoten))")
          .eq("matho", matho)
          .in("trangthai", ["CHO_THUC_HIEN", "DANG_THUC_HIEN", "HOAN_THANH"])
          .order("mapc", { ascending: false }),
        supabaseAdmin
          .from("nhatkygiacong")
          .select("mank", { count: "exact", head: true })
          .eq("matho", matho)
          .eq("sukien", "LOI")
          .eq("trangthaixuly", "CHO_XU_LY"),
      ]);

    if (workerError) throw HttpError.internal(workerError.message);
    if (taskError) throw HttpError.internal(taskError.message);
    if (issueError) throw HttpError.internal(issueError.message);

    const rows = (tasks ?? []) as { mapc: number; madh: number; trangthai: string; donhang?: unknown }[];
    const counts = rows.reduce(
      (acc, task) => {
        if (task.trangthai === "CHO_THUC_HIEN") acc.pending += 1;
        if (task.trangthai === "DANG_THUC_HIEN") acc.active += 1;
        if (task.trangthai === "HOAN_THANH") acc.done += 1;
        return acc;
      },
      { pending: 0, active: 0, done: 0, issues: issueCount ?? 0, unread: 0 },
    );

    const notificationSummary = await notificationsService.summary(matho);
    counts.unread = notificationSummary.unreadCount;

    return {
      worker,
      counts,
      latestTasks: rows.slice(0, 5),
    };
  },

  // Lấy danh sách công việc của worker theo mã thợ (chỉ lấy CHO_THUC_HIEN, DANG_THUC_HIEN, HOAN_THANH)
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

  // Thợ cập nhật trạng thái nhiệm vụ (VD: chuyển sang DANG_THUC_HIEN).
  async updateStatus(mapc: number, matho: number, dto: UpdateTaskDto) {
    // Đảm bảo nhiệm vụ thuộc về worker này
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

  // Thợ từ chối nhiệm vụ: ghi lý do từ chối, gửi thông báo cho quản trị viên.
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

    // Lưu một chuỗi lý do đầy đủ để quản trị viên nhìn ngay trong màn phân công,
    // đồng thời vẫn giữ mã lý do trong payload thông báo để sau này thống kê được.
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
