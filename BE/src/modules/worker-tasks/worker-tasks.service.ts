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

type CuttingCompletionProgress = {
  total: number;
  completed: number;
  withCutPhotos: number;
  missingCount: number;
  missingMasdcs: number[];
  readyForCompletion: boolean;
  hasCompletionPhoto: boolean;
};

type PlanProgressRow = {
  mapc: number;
  masdc: number;
  maphoi: number | null;
  trangthai: string | null;
};

type ImageProgressRow = {
  mapc: number | null;
  masdc: number | null;
  maphoi: number | null;
  loaianh: string | null;
};

function emptyCuttingProgress(): CuttingCompletionProgress {
  return {
    total: 0,
    completed: 0,
    withCutPhotos: 0,
    missingCount: 0,
    missingMasdcs: [],
    readyForCompletion: false,
    hasCompletionPhoto: false,
  };
}

async function loadCuttingProgress(mapcs: number[]) {
  const uniqueMapcs = [...new Set(mapcs.filter((mapc) => Number.isFinite(mapc)))];
  const progressByMapc = new Map<number, CuttingCompletionProgress>();
  uniqueMapcs.forEach((mapc) => progressByMapc.set(mapc, emptyCuttingProgress()));
  if (uniqueMapcs.length === 0) return progressByMapc;

  const [{ data: plans, error: planError }, { data: images, error: imageError }] = await Promise.all([
    supabaseAdmin
      .from("sodocat")
      .select("mapc, masdc, maphoi, trangthai")
      .in("mapc", uniqueMapcs)
      .order("masdc", { ascending: true }),
    supabaseAdmin
      .from("hinhanh")
      .select("mapc, masdc, maphoi, loaianh")
      .in("mapc", uniqueMapcs)
      .in("loaianh", ["CAT_PHOI", "HOAN_THANH_CONG_TRINH"]),
  ]);
  if (planError) throw HttpError.internal(planError.message);
  if (imageError) throw HttpError.internal(imageError.message);

  const plansByMapc = new Map<number, PlanProgressRow[]>();
  for (const plan of (plans ?? []) as PlanProgressRow[]) {
    const rows = plansByMapc.get(plan.mapc) ?? [];
    rows.push(plan);
    plansByMapc.set(plan.mapc, rows);
  }

  const imagesByMapc = new Map<number, ImageProgressRow[]>();
  for (const image of (images ?? []) as ImageProgressRow[]) {
    if (!image.mapc) continue;
    const rows = imagesByMapc.get(image.mapc) ?? [];
    rows.push(image);
    imagesByMapc.set(image.mapc, rows);
  }

  for (const mapc of uniqueMapcs) {
    const planRows = plansByMapc.get(mapc) ?? [];
    const imageRows = imagesByMapc.get(mapc) ?? [];
    const cutPhotoMasdcs = new Set(
      imageRows
        .filter((image) => image.loaianh === "CAT_PHOI" && image.masdc)
        .map((image) => image.masdc as number),
    );
    const missingMasdcs = planRows
      .filter((plan) => plan.trangthai !== "HOAN_THANH" || !cutPhotoMasdcs.has(plan.masdc))
      .map((plan) => plan.masdc);

    progressByMapc.set(mapc, {
      total: planRows.length,
      completed: planRows.filter((plan) => plan.trangthai === "HOAN_THANH").length,
      withCutPhotos: planRows.filter((plan) => cutPhotoMasdcs.has(plan.masdc)).length,
      missingCount: missingMasdcs.length,
      missingMasdcs,
      readyForCompletion: planRows.length > 0 && missingMasdcs.length === 0,
      hasCompletionPhoto: imageRows.some((image) => image.loaianh === "HOAN_THANH_CONG_TRINH"),
    });
  }

  return progressByMapc;
}

async function getCuttingProgress(mapc: number) {
  return (await loadCuttingProgress([mapc])).get(mapc) ?? emptyCuttingProgress();
}

function attachCuttingProgress<T extends { mapc: number }>(
  rows: T[],
  progressByMapc: Map<number, CuttingCompletionProgress>,
) {
  return rows.map((row) => ({
    ...row,
    cuttingProgress: progressByMapc.get(row.mapc) ?? emptyCuttingProgress(),
  }));
}

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
    const rows = (data ?? []) as Array<{ mapc: number }>;
    const progressByMapc = await loadCuttingProgress(rows.map((row) => row.mapc));
    return attachCuttingProgress(rows, progressByMapc);
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
    if (dto.trangthai === "HOAN_THANH") {
      if (current.trangthai !== "DANG_THUC_HIEN") {
        throw HttpError.badRequest("Chi duoc hoan thanh phan cong dang lam");
      }
      const progress = await getCuttingProgress(mapc);
      if (!progress.readyForCompletion) {
        const message =
          progress.total === 0
            ? "Chua co so do cat nao cho phan cong nay"
            : `Con ${progress.missingCount} phoi/so do chua co anh xac nhan cat hoac chua hoan thanh`;
        throw HttpError.badRequest(message);
      }
      if (!progress.hasCompletionPhoto) {
        throw HttpError.badRequest("Can upload anh HOAN_THANH_CONG_TRINH truoc khi hoan thanh phan cong");
      }
    }

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
