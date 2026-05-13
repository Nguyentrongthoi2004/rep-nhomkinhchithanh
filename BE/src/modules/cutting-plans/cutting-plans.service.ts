import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

type BomItem = {
  mactdh: number;
  mavt: number;
  mota: string | null;
  chieudaicat: number | null;
  soluong: number;
  vattu: { tenvt: string; donvitinh: string } | null;
};

type AssignmentWithBom = {
  mapc: number;
  madh: number;
  trangthai: string;
  matho: number;
  donhang: {
    madh: number;
    khachhang: { hoten: string } | null;
    chitietdh: BomItem[];
  } | null;
};

type RawStock = {
  maphoi: number;
  mavt: number;
  chieudaibandau: number;
  chieudaihientai: number;
  trangthai: string;
  vattu: { tenvt: string; donvitinh: string } | null;
};

type CutPiece = {
  mactdh: number;
  mavt: number;
  length: number;
  label: string;
};

type PlannedBar = {
  stock: RawStock;
  remaining: number;
  cuts: CutPiece[];
};

const PLAN_SELECT = `
  masdc,
  mapc,
  maphoi,
  trangthai,
  khothanhphoi:maphoi (
    maphoi,
    mavt,
    chieudaibandau,
    chieudaihientai,
    trangthai,
    vattu:mavt ( tenvt, donvitinh )
  ),
  phancong:mapc (
    mapc,
    matho,
    trangthai,
    donhang:madh (
      madh,
      trangthai,
      khachhang:makh ( hoten )
    ),
    nguoidung:matho ( mand, hoten )
  ),
  chitietcat (
    mactc,
    mactdh,
    thutucat,
    chieudaicat,
    trangthai,
    chitietdh:mactdh ( mota, mavt, vattu:mavt ( tenvt, donvitinh ) )
  )
`;

async function getRuleValue(code: string, fallback: number) {
  const { data, error } = await supabaseAdmin.from("quytac").select("giatri").eq("maqt", code).maybeSingle();
  if (error) throw HttpError.internal(error.message);
  return Number(data?.giatri ?? fallback);
}

function expandPieces(items: BomItem[]) {
  const pieces: CutPiece[] = [];
  for (const item of items) {
    if (!item.chieudaicat || item.chieudaicat <= 0) continue;
    for (let i = 0; i < item.soluong; i += 1) {
      pieces.push({
        mactdh: item.mactdh,
        mavt: item.mavt,
        length: item.chieudaicat,
        label: item.mota || item.vattu?.tenvt || `CT-${item.mactdh}`,
      });
    }
  }
  return pieces.sort((a, b) => b.length - a.length);
}

function planCuts(pieces: CutPiece[], stocks: RawStock[], kerf: number, safeMargin: number) {
  const bars: PlannedBar[] = stocks
    .filter((s) => s.trangthai !== "BO_DI" && s.chieudaihientai > safeMargin * 2)
    .sort((a, b) => b.chieudaihientai - a.chieudaihientai)
    .map((stock) => ({
      stock,
      remaining: stock.chieudaihientai - safeMargin * 2,
      cuts: [],
    }));

  for (const piece of pieces) {
    const bar = bars.find((candidate) => {
      if (candidate.stock.mavt !== piece.mavt) return false;
      return candidate.remaining >= piece.length + kerf;
    });

    if (!bar) {
      throw HttpError.badRequest(`Khong du phoi cho ${piece.label} (${piece.length}mm)`);
    }

    bar.remaining -= piece.length + kerf;
    bar.cuts.push(piece);
  }

  return bars.filter((bar) => bar.cuts.length > 0);
}

async function getAssignment(mapc: number) {
  const { data, error } = await supabaseAdmin
    .from("phancong")
    .select(`
      mapc,
      madh,
      matho,
      trangthai,
      donhang:madh (
        madh,
        khachhang:makh ( hoten ),
        chitietdh (
          mactdh,
          mavt,
          mota,
          chieudaicat,
          soluong,
          vattu:mavt ( tenvt, donvitinh )
        )
      )
    `)
    .eq("mapc", mapc)
    .maybeSingle();
  if (error) throw HttpError.internal(error.message);
  if (!data) throw HttpError.notFound(`Assignment ${mapc} not found`);
  return data as unknown as AssignmentWithBom;
}

async function listPlansForAssignment(mapc: number) {
  const { data, error } = await supabaseAdmin
    .from("sodocat")
    .select(PLAN_SELECT)
    .eq("mapc", mapc)
    .order("masdc", { ascending: true });
  if (error) throw HttpError.internal(error.message);
  return data ?? [];
}

export const cuttingPlansService = {
  async listAdmin() {
    const { data, error } = await supabaseAdmin
      .from("sodocat")
      .select(PLAN_SELECT)
      .order("masdc", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async listForWorker(matho: number) {
    const { data, error } = await supabaseAdmin
      .from("sodocat")
      .select(PLAN_SELECT)
      .eq("phancong.matho", matho)
      .order("masdc", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return (data ?? []).filter((row) => row.phancong !== null);
  },

  async getForAssignment(mapc: number) {
    await getAssignment(mapc);
    return listPlansForAssignment(mapc);
  },

  async createForAssignment(mapc: number) {
    const assignment = await getAssignment(mapc);
    const items = assignment.donhang?.chitietdh ?? [];
    const pieces = expandPieces(items);
    if (pieces.length === 0) throw HttpError.badRequest("Don hang khong co chi tiet cat nhom");

    const materialIds = [...new Set(pieces.map((piece) => piece.mavt))];
    const { data: stockRows, error: stockErr } = await supabaseAdmin
      .from("khothanhphoi")
      .select("maphoi, mavt, chieudaibandau, chieudaihientai, trangthai, vattu:mavt(tenvt, donvitinh)")
      .in("mavt", materialIds)
      .neq("trangthai", "BO_DI");
    if (stockErr) throw HttpError.internal(stockErr.message);

    const kerf = await getRuleValue("BLADE_KERF", 5);
    const safeMargin = await getRuleValue("SAFE_MARGIN", 20);
    const plannedBars = planCuts(pieces, (stockRows ?? []) as unknown as RawStock[], kerf, safeMargin);

    const { error: deleteErr } = await supabaseAdmin.from("sodocat").delete().eq("mapc", mapc);
    if (deleteErr) throw HttpError.internal(deleteErr.message);

    const { data: insertedPlans, error: planErr } = await supabaseAdmin
      .from("sodocat")
      .insert(plannedBars.map((bar) => ({ mapc, maphoi: bar.stock.maphoi, trangthai: "CHO_DUYET" })))
      .select("masdc, maphoi")
      .order("masdc", { ascending: true });
    if (planErr) throw HttpError.internal(planErr.message);

    const planByStock = new Map<number, number>();
    for (const plan of insertedPlans ?? []) {
      planByStock.set(plan.maphoi as number, plan.masdc as number);
    }

    const cutRows = plannedBars.flatMap((bar) => {
      const masdc = planByStock.get(bar.stock.maphoi);
      if (!masdc) return [];
      return bar.cuts.map((cut, index) => ({
        masdc,
        mactdh: cut.mactdh,
        thutucat: index + 1,
        chieudaicat: cut.length,
        trangthai: "CHO_CAT",
      }));
    });

    const { error: cutErr } = await supabaseAdmin.from("chitietcat").insert(cutRows);
    if (cutErr) throw HttpError.internal(cutErr.message);

    return listPlansForAssignment(mapc);
  },

  async completePlan(masdc: number, matho: number) {
    const { data: plan, error } = await supabaseAdmin
      .from("sodocat")
      .select("masdc, mapc, maphoi, trangthai, khothanhphoi:maphoi(chieudaihientai), phancong:mapc(matho), chitietcat(mactc, chieudaicat, trangthai)")
      .eq("masdc", masdc)
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!plan) throw HttpError.notFound(`Cutting plan ${masdc} not found`);

    const typed = plan as unknown as {
      masdc: number;
      mapc: number;
      maphoi: number;
      khothanhphoi: { chieudaihientai: number } | null;
      phancong: { matho: number } | null;
      chitietcat: Array<{ mactc: number; chieudaicat: number; trangthai: string }>;
    };
    if (typed.phancong?.matho !== matho) throw HttpError.forbidden("Cutting plan is not assigned to this worker");

    const before = typed.khothanhphoi?.chieudaihientai ?? 0;
    const kerf = await getRuleValue("BLADE_KERF", 5);
    const used = typed.chitietcat.reduce((sum, cut) => sum + Number(cut.chieudaicat || 0), 0);
    const kerfLoss = typed.chitietcat.length * kerf;
    const after = before - used - kerfLoss;
    if (after < 0) throw HttpError.badRequest("So do cat vuot qua chieu dai phoi hien tai");

    const SCRAP_THRESHOLD = 100; // mm - ngưỡng phế liệu
    const nextStatus = after < SCRAP_THRESHOLD ? "BO_DI" : "CON_DU";

    const [{ error: cutErr }, { error: planErr }, { error: stockErr }, { error: logErr }] = await Promise.all([
      supabaseAdmin.from("chitietcat").update({ trangthai: "DA_CAT" }).eq("masdc", masdc),
      supabaseAdmin.from("sodocat").update({ trangthai: "HOAN_THANH" }).eq("masdc", masdc),
      supabaseAdmin.from("khothanhphoi").update({ chieudaihientai: after, trangthai: nextStatus }).eq("maphoi", typed.maphoi),
      supabaseAdmin.from("nhatkygiacong").insert({
        maphoi: typed.maphoi,
        mapc: typed.mapc,
        matho,
        sukien: "CAT",
        chieudaitruoc: before,
        chieudaisau: after,
        ghichu: `Hoan thanh so do cat SDC-${masdc}`,
      }),
    ]);
    if (cutErr) throw HttpError.internal(cutErr.message);
    if (planErr) throw HttpError.internal(planErr.message);
    if (stockErr) throw HttpError.internal(stockErr.message);
    if (logErr) throw HttpError.internal(logErr.message);

    const siblingPlans = await listPlansForAssignment(typed.mapc);
    const allDone = siblingPlans.every((row) => (row as { trangthai?: string }).trangthai === "HOAN_THANH");
    if (allDone) {
      await supabaseAdmin.from("phancong").update({ trangthai: "HOAN_THANH" }).eq("mapc", typed.mapc);
    }

    return listPlansForAssignment(typed.mapc);
  },

  async reportIssue(masdc: number, matho: number, ghichu: string) {
    const { data: plan, error } = await supabaseAdmin
      .from("sodocat")
      .select("masdc, mapc, maphoi, khothanhphoi:maphoi(chieudaihientai), phancong:mapc(matho)")
      .eq("masdc", masdc)
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!plan) throw HttpError.notFound(`Cutting plan ${masdc} not found`);
    const typed = plan as unknown as {
      mapc: number;
      maphoi: number;
      khothanhphoi: { chieudaihientai: number } | null;
      phancong: { matho: number } | null;
    };
    if (typed.phancong?.matho !== matho) throw HttpError.forbidden("Cutting plan is not assigned to this worker");

    const current = typed.khothanhphoi?.chieudaihientai ?? 0;
    const [{ error: planErr }, { error: logErr }] = await Promise.all([
      supabaseAdmin.from("sodocat").update({ trangthai: "DANG_CAT" }).eq("masdc", masdc),
      supabaseAdmin.from("nhatkygiacong").insert({
        maphoi: typed.maphoi,
        mapc: typed.mapc,
        matho,
        sukien: "LOI",
        chieudaitruoc: current,
        chieudaisau: current,
        ghichu,
      }),
    ]);
    if (planErr) throw HttpError.internal(planErr.message);
    if (logErr) throw HttpError.internal(logErr.message);

    return listPlansForAssignment(typed.mapc);
  },
};
