/* eslint-disable @next/next/no-img-element */
"use client";

import {
  QrCode,
  Search,
  Inbox,
  BarChart2,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowDownUp,
  CalendarDays,
  Layers,
  Minus,
  Filter,
  ImageIcon,
  Eye,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiAssetUrl, apiData, apiJson } from "@/lib/api";
import { ConfirmDialog, InlineNotice, type NoticeState } from "@/components/admin/Feedback";

interface KhoPhoiType {
  maphoi: number;
  khothanhphoi_uid: string;
  chieudaibandau: number;
  chieudaihientai: number;
  trangthai: string;
  vattu: {
    tenvt: string;
    donvitinh: string;
  };
  lonhap: {
    ngaynhap: string;
    nhacungcap?: string | null;
  };
}

interface VatTuOption {
  mavt: number;
  tenvt: string;
  chieudaimacdinh: number | null;
}

interface RawStockSummary {
  total: number;
  moi: number;
  conDu: number;
  boDi: number;
}

interface RawStockPaged {
  items: KhoPhoiType[];
  total: number;
  page: number;
  pageSize: number;
  summary: RawStockSummary;
}

interface StockImage {
  maha: number;
  madh: number;
  duongdan: string;
  mota?: string | null;
  loaianh?: "CAT_PHOI" | "HOAN_THANH_CONG_TRINH" | "BAO_CAO_SU_CO" | "KHAC";
  mapc?: number | null;
  masdc?: number | null;
  maphoi?: number | null;
  thoigian?: string | null;
  nguoidung?: { hoten: string } | null;
}

type RawSortKey =
  | "maphoi"
  | "chieudaihientai"
  | "chieudaibandau"
  | "mavt"
  | "trangthai"
  | "malonhap";

type QuickImportRow = {
  key: string;
  mavt: number;
  chieudaibandau: number;
  quantity: number;
};

function makeQuickRow(materials: VatTuOption[]): QuickImportRow {
  const m = materials[0];
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    mavt: m?.mavt ?? 0,
    chieudaibandau: m?.chieudaimacdinh ?? 6000,
    quantity: 50,
  };
}

const QUICK_MAX_QTY_PER_LINE = 500;
const QUICK_MAX_LINES = 25;
const QUICK_MAX_TOTAL_BARS = 4000;

const IMAGE_TYPE_LABEL: Record<NonNullable<StockImage["loaianh"]>, string> = {
  CAT_PHOI: "Xác nhận cắt phôi",
  HOAN_THANH_CONG_TRINH: "Hoàn thành công trình",
  BAO_CAO_SU_CO: "Báo cáo sự cố",
  KHAC: "Ảnh khác",
};

function stockUid(maphoi: number) {
  return `UID-${maphoi.toString().padStart(5, "0")}`;
}

interface RawStockGroupedByImportDayResult {
  days: Array<{
    ngay: string;
    soLuongThanh: number;
    batches: Array<{
      malonhap: number;
      nhacungcap: string | null;
      ngaynhap: string;
      soLuongThanh: number;
      vattus: Array<{
        mavt: number;
        tenvt: string;
        donvitinh?: string | null;
        soLuongThanh: number;
      }>;
    }>;
  }>;
  totalThanhMatched: number;
}

function formatNgayHeader(ymd: string): string {
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  const y = parts[0];
  const mo = parts[1];
  const da = parts[2];
  if (!y || !mo || !da) return ymd;
  return new Date(y, mo - 1, da).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RawMaterialInventoryPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [minLengthInput, setMinLengthInput] = useState("");
  const [lengthMode, setLengthMode] = useState<"exact" | "min">("exact");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [mavtFilter, setMavtFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<string | "">("");
  const [sortBy, setSortBy] = useState<RawSortKey>("maphoi");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [listTotal, setListTotal] = useState(0);
  const [summary, setSummary] = useState<RawStockSummary>({ total: 0, moi: 0, conDu: 0, boDi: 0 });

  const [inventory, setInventory] = useState<KhoPhoiType[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "byDay">("list");
  const [malonhapFilter, setMalonhapFilter] = useState<number | "">("");
  const [groupYear, setGroupYear] = useState<number | "">("");
  const [groupMonth, setGroupMonth] = useState<number | "">("");
  const [groupedData, setGroupedData] = useState<RawStockGroupedByImportDayResult | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);

  const yearChoices = useMemo(() => {
    const yStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
    }).format(new Date());
    const ny = parseInt(yStr, 10);
    const out: number[] = [];
    for (let y = ny + 1; y >= ny - 8; y -= 1) out.push(y);
    return out;
  }, []);

  // Hộp thoại nhập phôi mới
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [materials, setMaterials] = useState<VatTuOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    mavt: 0,
    quantity: 1,
    chieudaibandau: 6000,
    nhacungcap: "",
  });

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickRows, setQuickRows] = useState<QuickImportRow[]>([]);
  const [quickNcc, setQuickNcc] = useState("");

  const quickTotalPreview = useMemo(
    () =>
      quickRows.reduce(
        (s, r) =>
          r.mavt > 0 && r.quantity > 0 && r.chieudaibandau > 0
            ? s + Math.min(QUICK_MAX_QTY_PER_LINE, Math.floor(r.quantity))
            : s,
        0,
      ),
    [quickRows],
  );

  // Hộp thoại sửa phôi
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<KhoPhoiType | null>(null);
  const [editForm, setEditForm] = useState({ chieudaihientai: 0, trangthai: "MOI" });
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KhoPhoiType | null>(null);
  const [detailStock, setDetailStock] = useState<KhoPhoiType | null>(null);
  const [stockImages, setStockImages] = useState<StockImage[]>([]);
  const [stockImagesLoading, setStockImagesLoading] = useState(false);
  const [stockImageError, setStockImageError] = useState("");
  const hasLengthFilter = useMemo(() => {
    const minLength = Number(minLengthInput);
    return Number.isFinite(minLength) && minLength > 0;
  }, [minLengthInput]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput.trim()), 320);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, minLengthInput, lengthMode]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const p = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        order: sortOrder,
      });
      if (mavtFilter !== "") {
        p.set("mavt", String(mavtFilter));
      }
      if (statusFilter !== "") {
        p.set("trangthai", statusFilter);
      }
      if (searchDebounced) {
        p.set("q", searchDebounced);
      }
      if (malonhapFilter !== "") {
        p.set("malonhap", String(malonhapFilter));
      }
      const minLength = Number(minLengthInput);
      if (Number.isFinite(minLength) && minLength > 0) {
        p.set("minLength", String(Math.floor(minLength)));
        p.set("lengthMode", lengthMode);
      }
      const body = await apiData<RawStockPaged | KhoPhoiType[]>(`/api/admin/raw-stock?${p.toString()}`);
      if (Array.isArray(body)) {
        const rows = body.map((x) => ({ ...x, khothanhphoi_uid: "" }));
        setInventory(rows);
        setListTotal(rows.length);
        const moi = rows.filter((r) => r.trangthai === "MOI").length;
        const conDu = rows.filter((r) => r.trangthai === "CON_DU").length;
        const boDi = rows.filter((r) => r.trangthai === "BO_DI").length;
        setSummary({ total: rows.length, moi, conDu, boDi });
      } else {
        setInventory((body.items || []).map((x) => ({ ...x, khothanhphoi_uid: "" })));
        setListTotal(body.total ?? 0);
        if (body.summary) {
          setSummary(body.summary);
        }
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        `${detail} — Kiểm tra BE đang chạy (port 4000), sau đó restart \`npm run dev\` FE; file .env của BE phải trùng Supabase bạn đang xem.`,
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, mavtFilter, statusFilter, searchDebounced, malonhapFilter, minLengthInput, lengthMode]);

  const fetchGroupedByDay = useCallback(async () => {
    setGroupLoading(true);
    setErrorMsg("");
    try {
      const p = new URLSearchParams();
      if (mavtFilter !== "") p.set("mavt", String(mavtFilter));
      if (groupYear !== "") p.set("nam", String(groupYear));
      if (groupMonth !== "") p.set("thang", String(groupMonth));
      const qs = p.toString();
      const body = await apiData<RawStockGroupedByImportDayResult>(
        `/api/admin/raw-stock/grouped-by-import-day${qs ? `?${qs}` : ""}`,
      );
      setGroupedData(body);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        `${detail} — Kiểm tra BE đang chạy (port 4000); endpoint grouped-by-import-day cần bản BE mới nhất.`,
      );
    } finally {
      setGroupLoading(false);
    }
  }, [mavtFilter, groupYear, groupMonth]);

  const fetchMaterials = useCallback(async () => {
    try {
      const list = await apiData<VatTuOption[]>("/api/admin/materials-options");
      setMaterials(list);
      setCreateForm((p) => ({
        ...p,
        mavt: p.mavt || (list[0]?.mavt ?? 0),
        chieudaibandau: p.chieudaibandau || (list[0]?.chieudaimacdinh ?? 6000),
      }));
    } catch (err: unknown) {
      // Bỏ qua lỗi này; trang vẫn dùng được nếu API tạo lô chưa sẵn sàng.
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (viewMode !== "list") return;
    void fetchInventory();
  }, [viewMode, fetchInventory]);

  useEffect(() => {
    if (viewMode !== "byDay") return;
    void fetchGroupedByDay();
  }, [viewMode, fetchGroupedByDay]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

    const totalPages = Math.max(1, Math.ceil(listTotal / pageSize));

    const getStatusBadge = (status: string) => {
      switch(status) {
        case 'MOI': return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">NGUYÊN TEM (MỚI)</span>;
        case 'CON_DU': return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded">KHÚC ĐỀ-XÊ DƯ</span>;
        case 'BO_DI': return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-red-500 bg-red-500/10 border border-red-500/20 rounded">BỎ ĐI</span>;
        default: return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-gray-400 bg-gray-500/10 rounded">{status}</span>;
      }
    }

    const openCreate = () => {
      setIsCreateOpen(true);
    };

    const openQuickImport = () => {
      if (!materials.length) {
        setNotice({ tone: "warn", text: "Đang tải danh sách vật tư, thử lại sau vài giây." });
        return;
      }
      setQuickRows((rows) => (rows.length ? rows : [makeQuickRow(materials)]));
      setQuickOpen(true);
    };

    const addQuickRow = () => {
      if (quickRows.length >= QUICK_MAX_LINES) {
        setNotice({ tone: "warn", text: `Tối đa ${QUICK_MAX_LINES} dòng mỗi lần nhập.` });
        return;
      }
      setQuickRows((rows) => [...rows, makeQuickRow(materials)]);
    };

    const removeQuickRow = (key: string) => {
      setQuickRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)));
    };

    const handleQuickSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const items = quickRows
        .filter((r) => r.mavt > 0 && r.quantity > 0 && r.chieudaibandau > 0)
        .map((r) => ({
          mavt: r.mavt,
          quantity: Math.min(QUICK_MAX_QTY_PER_LINE, Math.floor(r.quantity)),
          chieudaibandau: Math.floor(r.chieudaibandau),
        }));
      if (!items.length) {
        setNotice({ tone: "warn", text: "Thêm ít nhất một dòng: chọn vật tư, chiều dài và số lượng thanh." });
        return;
      }
      const totalBars = items.reduce((s, i) => s + i.quantity, 0);
      if (totalBars > QUICK_MAX_TOTAL_BARS) {
        setNotice({ tone: "warn", text: `Tổng số thanh một lần không vượt quá ${QUICK_MAX_TOTAL_BARS} (hiện ${totalBars}). Chia thành nhiều lần nhập.` });
        return;
      }
      setIsSubmitting(true);
      try {
        await apiJson("/api/admin/raw-stock", {
          method: "POST",
          body: JSON.stringify({
            nhacungcap: quickNcc.trim() || null,
            items,
          }),
        });
        setQuickOpen(false);
        setQuickNcc("");
        setQuickRows([]);
        setNotice({ tone: "ok", text: `Đã nhập bổ sung ${totalBars} thanh phôi.` });
        fetchInventory();
        if (viewMode === "byDay") void fetchGroupedByDay();
      } catch (err: unknown) {
        setNotice({ tone: "error", text: err instanceof Error ? err.message : String(err) });
      } finally {
        setIsSubmitting(false);
      }
    };

    const openEdit = (item: KhoPhoiType) => {
      setEditing(item);
      setEditForm({ chieudaihientai: item.chieudaihientai, trangthai: item.trangthai });
      setIsEditOpen(true);
    };

    const openStockDetail = async (item: KhoPhoiType) => {
      setDetailStock(item);
      setStockImages([]);
      setStockImageError("");
      setStockImagesLoading(true);
      try {
        const images = await apiData<StockImage[]>(`/api/admin/images/stock/${item.maphoi}`);
        setStockImages(images);
      } catch (err: unknown) {
        setStockImageError(err instanceof Error ? err.message : String(err));
      } finally {
        setStockImagesLoading(false);
      }
    };

    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!createForm.mavt) return setNotice({ tone: "warn", text: "Vui lòng chọn vật tư." });
      if (createForm.quantity <= 0) return setNotice({ tone: "warn", text: "Số lượng không hợp lệ." });
      if (createForm.chieudaibandau <= 0) return setNotice({ tone: "warn", text: "Chiều dài không hợp lệ." });
      setIsSubmitting(true);
      try {
        await apiJson("/api/admin/raw-stock", {
          method: "POST",
          body: JSON.stringify({
            nhacungcap: createForm.nhacungcap || null,
            items: [{
              mavt: createForm.mavt,
              quantity: createForm.quantity,
              chieudaibandau: createForm.chieudaibandau,
            }],
          }),
        });
        setIsCreateOpen(false);
        setNotice({ tone: "ok", text: `Đã nhập ${createForm.quantity} thanh phôi.` });
        fetchInventory();
      } catch (err: unknown) {
        setNotice({ tone: "error", text: err instanceof Error ? err.message : String(err) });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editing) return;
      setIsSubmitting(true);
      try {
        await apiJson(`/api/admin/raw-stock/${editing.maphoi}`, {
          method: "PATCH",
          body: JSON.stringify({
            chieudaihientai: editForm.chieudaihientai,
            trangthai: editForm.trangthai,
          }),
        });
        setIsEditOpen(false);
        setNotice({ tone: "ok", text: `Đã cập nhật UID-${editing.maphoi.toString().padStart(5, "0")}.` });
        fetchInventory();
      } catch (err: unknown) {
        setNotice({ tone: "error", text: err instanceof Error ? err.message : String(err) });
      } finally {
        setIsSubmitting(false);
      }
    };

    const goToThanhListForBatch = (malonhap: number) => {
      setSearchDebounced("");
      setSearchInput("");
      setMalonhapFilter(malonhap);
      setPage(1);
      setViewMode("list");
    };

    const handleDelete = async (item: KhoPhoiType) => {
      setIsSubmitting(true);
      try {
        await apiJson(`/api/admin/raw-stock/${item.maphoi}`, { method: "DELETE" });
        setNotice({ tone: "ok", text: `Đã xóa UID-${item.maphoi.toString().padStart(5, "0")}.` });
        fetchInventory();
      } catch (err: unknown) {
        setNotice({ tone: "error", text: err instanceof Error ? err.message : String(err) });
      } finally {
        setIsSubmitting(false);
      }
    };
  
    return (
      <div className="space-y-6">
        
        {/* Đầu trang */}
        <div className="flex justify-between items-center bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-sm">
          <div>
             <h1 className="text-2xl font-bold text-gray-100 flex items-center">
              <Inbox className="w-6 h-6 mr-3 text-cyan-500" />
              Quản Lý Lô Phôi & Đề-Xê
            </h1>
            <p className="text-gray-400 text-sm mt-1 ml-9">Định danh từng thanh nhôm nguyên liệu trong xưởng.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
            <button
              type="button"
              title="Quét nhập kho"
              aria-label="Quét nhập kho"
              className="bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Quét Nhập Kho
            </button>
            <button
              type="button"
              onClick={openQuickImport}
              className="bg-emerald-700/90 hover:bg-emerald-600 text-white border border-emerald-500/30 px-4 py-2.5 rounded-lg flex items-center font-bold transition-colors"
            >
              <Layers className="w-4 h-4 mr-2" />
              Nhập phôi nhanh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-lg flex items-center font-bold transition-colors shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]"
            >
              <Plus className="w-4 h-4 mr-2" /> Nhập Lô Phôi Mới
            </button>
          </div>
        </div>
        <InlineNotice notice={notice} onClose={() => setNotice(null)} />

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">{errorMsg}</div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Chế độ xem:</span>
          <div className="inline-flex rounded-xl border border-white/10 bg-[#0a0a0c] p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-cyan-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Danh sách thanh
            </button>
            <button
              type="button"
              onClick={() => setViewMode("byDay")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                viewMode === "byDay"
                  ? "bg-cyan-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <CalendarDays className="w-4 h-4 shrink-0" aria-hidden />
              Theo ngày nhập kho
            </button>
          </div>
        </div>
  
        {/* Thống kê toàn kho, không phụ thuộc phân trang */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-emerald-500/10 rounded-full mr-4 border border-emerald-500/20">
              <BarChart2 className="text-emerald-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Tổng Tồn Kho Thực Tế</p>
              <p className="text-2xl font-bold text-gray-100">
                {summary.total} <span className="text-sm font-normal text-gray-500">thanh</span>
              </p>
            </div>
          </div>
          <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-cyan-500/10 rounded-full mr-4 border border-cyan-500/20">
              <Inbox className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Thanh Mới (MOI)</p>
              <p className="text-2xl font-bold text-gray-100">
                {summary.moi} <span className="text-sm font-normal text-gray-500">đoạn</span>
              </p>
            </div>
          </div>
          <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-amber-500/10 rounded-full mr-4 border border-amber-500/20">
              <Inbox className="text-amber-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Phôi Đề-Xê Có Thể Tái Chế</p>
              <p className="text-2xl font-bold text-gray-100">
                {summary.conDu} <span className="text-sm font-normal text-gray-500">đoạn</span>
              </p>
            </div>
          </div>
        </div>

        {/* Thanh công cụ */}
        {viewMode === "list" ? (
          <div className="space-y-3 rounded-2xl border border-white/5 bg-[#0a0a0c]/70 p-4 shadow-sm">
            <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(320px,1fr)_220px_260px_190px]">
              {malonhapFilter !== "" && (
                <div className="lg:col-span-4 flex w-full flex-wrap items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-sm text-cyan-100">
                  <span>
                    Đang lọc <strong className="font-mono">lô #{malonhapFilter}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMalonhapFilter("");
                      setPage(1);
                    }}
                    className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-gray-200 hover:bg-white/10"
                  >
                    Bỏ lọc lô
                  </button>
                </div>
              )}
              <div className="relative min-w-0">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="UID, số mã phôi, VT-#, hoặc tên vật tư..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => setAdvancedFiltersOpen((open) => !open)}
                className={`inline-flex h-[42px] min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                  advancedFiltersOpen || hasLengthFilter
                    ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                    : "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                }`}
              >
                <Filter className="h-4 w-4 shrink-0" />
                <span>Bộ lọc nâng cao</span>
                {hasLengthFilter && (
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                    Đang lọc
                  </span>
                )}
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${advancedFiltersOpen ? "rotate-180" : ""}`} />
              </button>
              <label className="flex min-w-0 flex-col gap-1 text-xs text-gray-500">
                <span className="uppercase tracking-wider font-bold text-[10px]">Loại nhôm</span>
                <select
                  title="Lọc theo vật tư"
                  aria-label="Lọc theo vật tư"
                  value={mavtFilter === "" ? "" : String(mavtFilter)}
                  onChange={(e) => {
                    setMavtFilter(e.target.value === "" ? "" : Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Tất cả loại nhôm</option>
                  {materials.map((m) => (
                    <option key={m.mavt} value={m.mavt}>
                      VT-{m.mavt} · {m.tenvt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-xs text-gray-500">
                <span className="uppercase tracking-wider font-bold text-[10px]">Trạng thái</span>
                <select
                  title="Lọc trạng thái phôi"
                  aria-label="Lọc trạng thái phôi"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Tất cả</option>
                  <option value="MOI">Nguyên tem (MOI)</option>
                  <option value="CON_DU">Đề-xê (CON_DU)</option>
                  <option value="BO_DI">Bỏ đi (BO_DI)</option>
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/5 pt-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[240px_240px_150px]">
                <label className="flex min-w-0 flex-col gap-1 text-xs text-gray-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Sắp xếp theo</span>
                  <select
                    title="Sắp xếp"
                    aria-label="Sắp xếp danh sách phôi"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as RawSortKey);
                      setPage(1);
                    }}
                    className="h-[42px] w-full rounded-lg border border-white/10 bg-[#0a0a0c] px-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="maphoi">Mã UID</option>
                    <option value="chieudaihientai">Chiều dài hiện tại</option>
                    <option value="chieudaibandau">Chiều dài ban đầu</option>
                    <option value="mavt">Mã loại vật tư</option>
                    <option value="trangthai">Trạng thái</option>
                    <option value="malonhap">Lô nhập</option>
                  </select>
                </label>

                <label className="flex min-w-0 flex-col gap-1 text-xs text-gray-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Thứ tự</span>
                  <button
                    type="button"
                    title={sortOrder === "desc" ? "Đang giảm dần" : "Đang tăng dần"}
                    onClick={() => {
                      setPage(1);
                      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                    }}
                    className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10"
                  >
                    <ArrowDownUp className="h-4 w-4 shrink-0 text-cyan-300" />
                    <span className="truncate">{sortOrder === "desc" ? "Mới / lớn trước" : "Cũ / nhỏ trước"}</span>
                  </button>
                </label>

                <label className="flex min-w-0 flex-col gap-1 text-xs text-gray-500 sm:max-lg:col-span-2 lg:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Hiển thị</span>
                  <select
                    title="Số dòng mỗi trang"
                    aria-label="Số dòng mỗi trang"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-[42px] w-full rounded-lg border border-white/10 bg-[#0a0a0c] px-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value={10}>10 / trang</option>
                    <option value={15}>15 / trang</option>
                    <option value={25}>25 / trang</option>
                    <option value={50}>50 / trang</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center xl:min-h-[42px] xl:justify-end">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-400">
                  <span>Kết quả:</span>
                  <strong className="text-gray-100">{listTotal} dòng</strong>
                  <span className="text-gray-600">•</span>
                  <span>
                    Trang <strong className="text-gray-100">{page}/{totalPages}</strong>
                  </span>
                </div>
              </div>
            </div>

            {advancedFiltersOpen && (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Filter className="h-4 w-4 text-amber-200" />
                      <h3 className="text-sm font-bold text-amber-100">Tìm phôi theo chiều dài</h3>
                      {hasLengthFilter && (
                        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                          Đang áp dụng
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-5 text-slate-400">
                      Dùng để tìm thanh đúng chiều dài cần kiểm hoặc thanh đủ dài để cắt. Bộ lọc vẫn được giữ khi đóng panel.
                    </p>
                  </div>

                  <div className="grid w-full gap-3 lg:w-[680px] sm:grid-cols-[minmax(180px,1fr)_220px]">
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Chiều dài cần tìm (mm)</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={minLengthInput}
                        onChange={(e) => {
                          setMinLengthInput(e.target.value.replace(/[^\d]/g, ""));
                          setPage(1);
                        }}
                        placeholder="Ví dụ 1000, 2000, 5000 mm"
                        className="h-[42px] rounded-lg border border-white/10 bg-[#0a0a0c] px-3 text-sm font-mono text-gray-100 outline-none transition-colors focus:border-amber-300"
                      />
                    </label>

                    <div className="flex flex-col gap-1 text-xs text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Chế độ lọc</span>
                      <div className="grid h-[42px] grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setLengthMode("exact");
                            setSortBy("chieudaihientai");
                            setSortOrder("asc");
                            setPage(1);
                          }}
                          className={`rounded-md px-2 text-[11px] font-bold transition-colors ${
                            lengthMode === "exact" ? "bg-amber-500 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                          }`}
                        >
                          Dùng bằng
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLengthMode("min");
                            setSortBy("chieudaihientai");
                            setSortOrder("asc");
                            setPage(1);
                          }}
                          className={`rounded-md px-2 text-[11px] font-bold transition-colors ${
                            lengthMode === "min" ? "bg-amber-500 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                          }`}
                        >
                          Dùng được ≥
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-xs leading-5 text-slate-400">
                    {lengthMode === "exact"
                      ? "Chỉ hiện phôi có chiều dài hiện tại đúng bằng số nhập."
                      : "Hiện các phôi đủ dài để cắt, ví dụ nhập 3000mm sẽ có cả thanh 6000mm."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[1000, 2000, 3000, 5000, 6000].map((mm) => (
                      <button
                        key={mm}
                        type="button"
                        onClick={() => {
                          setMinLengthInput(String(mm));
                          setLengthMode("exact");
                          setSortBy("chieudaihientai");
                          setSortOrder("asc");
                          setPage(1);
                        }}
                        className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-amber-50 hover:bg-amber-500/15"
                      >
                        {mm / 1000}m
                      </button>
                    ))}
                    {hasLengthFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setMinLengthInput("");
                          setPage(1);
                        }}
                        className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-gray-200 hover:bg-white/10"
                      >
                        Xóa lọc chiều dài
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#0a0a0c]/80 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex flex-col gap-1 text-xs text-gray-500 min-w-[200px]">
              <span className="uppercase tracking-wider font-bold text-[10px]">Loại nhôm</span>
              <select
                title="Lọc theo vật tư (theo ngày nhập)"
                aria-label="Lọc theo vật tư theo ngày nhập"
                value={mavtFilter === "" ? "" : String(mavtFilter)}
                onChange={(e) => setMavtFilter(e.target.value === "" ? "" : Number(e.target.value))}
                className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">Tất cả loại nhôm</option>
                {materials.map((m) => (
                  <option key={m.mavt} value={m.mavt}>
                    VT-{m.mavt} · {m.tenvt}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500 min-w-[130px]">
              <span className="uppercase tracking-wider font-bold text-[10px]">Năm</span>
              <select
                title="Năm (giờ VN)"
                aria-label="Lọc theo năm nhập kho"
                value={groupYear === "" ? "" : String(groupYear)}
                onChange={(e) =>
                  setGroupYear(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">Mọi năm</option>
                {yearChoices.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500 min-w-[120px]">
              <span className="uppercase tracking-wider font-bold text-[10px]">Tháng</span>
              <select
                title="Tháng"
                aria-label="Lọc theo tháng nhập kho"
                value={groupMonth === "" ? "" : String(groupMonth)}
                onChange={(e) =>
                  setGroupMonth(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">Mọi tháng</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void fetchGroupedByDay()}
              className="inline-flex items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-600/20 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-600/30"
            >
              Làm mới nhóm ngày
            </button>
            <p className="text-xs text-gray-500 sm:ml-auto sm:max-w-xs">
              Ngày tính theo mốc nhập kho (timezone Việt Nam). Chỉ tháng, không chọn năm → backend dùng năm hiện tại.
            </p>
          </div>
        )}

        {/* Chế độ xem nhóm theo ngày */}
        {viewMode === "byDay" && (
          <div className="space-y-3">
            {groupLoading ? (
              <div className="flex justify-center items-center rounded-2xl border border-white/5 bg-[#0a0a0c] py-20 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" aria-label="Đang tải" />
              </div>
            ) : groupedData != null && groupedData.days.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] px-6 py-12 text-center text-gray-500">
                Không có thanh nào khớp bộ lọc.
              </div>
            ) : (
              groupedData?.days?.map((day) => (
                <details
                  key={day.ngay}
                  className="group rounded-2xl border border-white/5 bg-[#0a0a0c] shadow-lg open:border-cyan-500/20"
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
                    <CalendarDays className="h-5 w-5 shrink-0 text-cyan-400/90" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold capitalize leading-snug text-gray-100">
                        {formatNgayHeader(day.ngay)}
                      </p>
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        Theo lịch VN ({day.ngay})
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-sm font-medium text-gray-200">
                      {day.soLuongThanh} thanh · {day.batches.length} lô
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-white/5 px-5 pb-5 pt-4">
                    {day.batches.map((b) => (
                      <div
                        key={b.malonhap}
                        className="rounded-xl border border-white/5 bg-white/2 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-mono text-base font-bold text-cyan-400">
                              Lô #{b.malonhap}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">
                              {b.nhacungcap?.trim()
                                ? `NCC: ${b.nhacungcap}`
                                : "Không ghi nhà cung cấp"}
                              {b.ngaynhap ? (
                                <span className="ml-2 text-gray-500">
                                  · Nhập:{" "}
                                  {new Date(b.ngaynhap).toLocaleString("vi-VN", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
                              ) : null}
                            </p>
                            <ul className="mt-3 space-y-1 text-sm text-gray-300">
                              {b.vattus.map((v) => (
                                <li key={v.mavt}>
                                  <span className="font-mono text-cyan-200/90">VT-{v.mavt}</span>{" "}
                                  <span>{v.tenvt}</span>
                                  {v.donvitinh ? (
                                    <span className="text-gray-500"> ({v.donvitinh})</span>
                                  ) : null}
                                  :{" "}
                                  <strong>{v.soLuongThanh}</strong>{" "}
                                  <span className="text-gray-500">thanh</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <button
                            type="button"
                            onClick={() => goToThanhListForBatch(b.malonhap)}
                            className="shrink-0 rounded-lg bg-cyan-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                          >
                            Chi tiết từng thanh
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))
            )}
            {!groupLoading && groupedData != null ? (
              <p className="text-center text-sm text-gray-500">
                Hiển thị <strong className="text-gray-300">{groupedData.totalThanhMatched}</strong>{" "}
                thanh theo các lọc trên (gom theo ngày nhập kho).
              </p>
            ) : null}
          </div>
        )}

        {/* Bảng tồn kho */}
        {viewMode === "list" && (
        <>
        {!loading && (
          <div className="space-y-3 md:hidden">
            {inventory.map((item) => (
              <div key={item.maphoi} className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-cyan-300">{stockUid(item.maphoi)}</p>
                    <p className="mt-1 text-base font-bold text-gray-100">{item.vattu?.tenvt}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Nhập: {item.lonhap?.ngaynhap ? new Date(item.lonhap.ngaynhap).toLocaleDateString("vi-VN") : "N/A"}
                    </p>
                  </div>
                  {getStatusBadge(item.trangthai)}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Ban đầu</p>
                    <p className="font-mono font-bold text-gray-100">{item.chieudaibandau} mm</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Hiện tại</p>
                    <p className="font-mono font-bold text-cyan-200">{item.chieudaihientai} mm</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => void openStockDetail(item)}
                    className="rounded-lg bg-cyan-500/10 px-3 py-2 text-sm font-bold text-cyan-200"
                  >
                    Chi tiết
                  </button>
                  <button type="button" onClick={() => openEdit(item)} className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm font-bold text-blue-200">
                    Sửa
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
                    Xóa
                  </button>
                </div>
              </div>
            ))}
            {inventory.length === 0 && <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-8 text-center text-sm text-gray-500">Không tìm thấy phôi phù hợp.</div>}
          </div>
        )}
        <div className="hidden bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg md:block">
          {loading ? (
             <div className="flex justify-center items-center py-20 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="p-4 font-semibold w-40">Mã Định Danh (UID)</th>
                <th className="p-4 font-semibold">Tên Vật Tư (Hệ Nhôm)</th>
                <th className="p-4 font-semibold text-center w-36">Chiều Dài Hiện Tại</th>
                <th className="p-4 font-semibold text-center w-32">Trạng Thái</th>
                <th className="p-4 font-semibold w-32 text-right">Ngày Nhập</th>
                <th className="p-4 font-semibold w-24 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {inventory.map((item) => (
                <tr key={item.maphoi} className="hover:bg-white/2 transition-colors group">
                  <td className="p-4 text-sm font-bold text-cyan-400 font-mono">
                    <button
                      type="button"
                      onClick={() => void openStockDetail(item)}
                      className="inline-flex items-center rounded-md px-1 py-1 text-left transition-colors hover:bg-cyan-400/10 hover:text-cyan-200"
                      title="Xem chi tiết phôi và ảnh"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-2 text-gray-500" />
                      {stockUid(item.maphoi)}
                    </button>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-300">{item.vattu?.tenvt}</td>
                  <td className="p-4 text-center text-sm font-mono font-bold text-gray-200">
                    {item.chieudaihientai} <span className="text-xs text-gray-500 font-sans">mm</span>
                    {item.chieudaihientai !== item.chieudaibandau && (
                      <div className="text-[10px] text-gray-500 font-sans mt-0.5">Khoản đầu: {item.chieudaibandau}mm</div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {getStatusBadge(item.trangthai)}
                  </td>
                  <td className="p-4 text-right text-sm text-gray-500">
                    {item.lonhap?.ngaynhap ? new Date(item.lonhap.ngaynhap).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => void openStockDetail(item)}
                        className="p-1.5 text-gray-400 hover:text-cyan-300 hover:bg-cyan-400/10 rounded-md transition-colors"
                        title="Chi tiết phôi / ảnh"
                        aria-label="Xem chi tiết phôi và ảnh"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                        title="Sửa"
                        aria-label="Sửa phôi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        title="Xóa"
                        aria-label="Xóa phôi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && !loading && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">Không tìm thấy mã vạch nào</td></tr>
              )}
            </tbody>
          </table>
          )}
        </div>
        </>
        )}

      {!loading && viewMode === "list" && listTotal > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, listTotal)} trong{" "}
            <span className="text-gray-300">{listTotal}</span> phù hợp bộ lọc
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:pointer-events-none hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:pointer-events-none hover:bg-white/10"
            >
              Sau
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

        {detailStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#0a0a0c] px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Chi tiết phôi</p>
                  <h3 className="mt-1 text-xl font-bold text-white">{stockUid(detailStock.maphoi)}</h3>
                  <p className="mt-1 text-sm text-gray-400">{detailStock.vattu?.tenvt || "Chưa có tên vật tư"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailStock(null)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Đóng chi tiết phôi"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[360px,1fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">Trạng thái</p>
                        <div className="mt-2">{getStatusBadge(detailStock.trangthai)}</div>
                      </div>
                      <ImageIcon className="h-6 w-6 text-cyan-300" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs text-gray-500">Ban đầu</p>
                        <p className="mt-1 font-mono text-lg font-bold text-gray-100">{detailStock.chieudaibandau} mm</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs text-gray-500">Hiện tại</p>
                        <p className="mt-1 font-mono text-lg font-bold text-cyan-200">{detailStock.chieudaihientai} mm</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Ngày nhập</span>
                        <span className="text-right text-gray-200">
                          {detailStock.lonhap?.ngaynhap
                            ? new Date(detailStock.lonhap.ngaynhap).toLocaleDateString("vi-VN")
                            : "Chưa có"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Nhà cung cấp</span>
                        <span className="text-right text-gray-200">{detailStock.lonhap?.nhacungcap || "Chưa có"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4 text-sm leading-6 text-cyan-50">
                    Ảnh xác nhận cắt phôi được gom theo UID ở đây để chủ xưởng kiểm nhanh thanh nào đã cắt,
                    phôi nào còn dư. Ảnh toàn công trình vẫn xem thuận tiện hơn ở chi tiết đơn hàng.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">Ảnh liên quan UID này</h4>
                      <p className="text-sm text-gray-500">Gồm ảnh cắt phôi, ảnh sự cố hoặc ảnh khác có gắn mã phôi.</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-300">
                      {stockImages.length} ảnh
                    </span>
                  </div>

                  {stockImagesLoading ? (
                    <div className="flex min-h-56 items-center justify-center text-gray-400">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Đang tải ảnh...
                    </div>
                  ) : stockImageError ? (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
                      {stockImageError}
                    </div>
                  ) : stockImages.length === 0 ? (
                    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-gray-500">
                      <ImageIcon className="mb-3 h-8 w-8 text-gray-600" />
                      <p>Chưa có ảnh nào gắn với {stockUid(detailStock.maphoi)}.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {stockImages.map((img) => {
                        const imageUrl = apiAssetUrl(img.duongdan);
                        return (
                          <a
                            key={img.maha}
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0c] transition-colors hover:border-cyan-400/40"
                          >
                            <div className="aspect-[4/3] overflow-hidden bg-black">
                              <img
                                src={imageUrl}
                                alt={img.mota || `${IMAGE_TYPE_LABEL[img.loaianh ?? "KHAC"]} ${stockUid(detailStock.maphoi)}`}
                                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                              />
                            </div>
                            <div className="space-y-2 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                                  {IMAGE_TYPE_LABEL[img.loaianh ?? "KHAC"]}
                                </span>
                                {img.masdc ? (
                                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">SDC-{img.masdc}</span>
                                ) : null}
                                {img.mapc ? (
                                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">PC-{img.mapc}</span>
                                ) : null}
                              </div>
                              {img.mota ? <p className="line-clamp-2 text-sm text-gray-200">{img.mota}</p> : null}
                              <p className="text-xs text-gray-500">
                                {img.nguoidung?.hoten || "Không rõ người chụp"}
                                {img.thoigian ? ` · ${new Date(img.thoigian).toLocaleString("vi-VN")}` : ""}
                              </p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hộp thoại nhập nhanh nhiều loại/số lượng lớn trong một lô */}
        {quickOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[#0a0a0c] shrink-0">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Layers className="w-5 h-5 mr-2 text-emerald-400" />
                  Nhập phôi nhanh (nhiều dòng)
                </h3>
                <button
                  type="button"
                  onClick={() => setQuickOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleQuickSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <p className="text-sm text-gray-400">
                    Mỗi dòng: một loại vật tư + chiều dài + số thanh. Tất cả vào{" "}
                    <strong className="text-gray-200">cùng một lô nhập</strong> (một lần bấm). Tối đa{" "}
                    {QUICK_MAX_LINES} dòng, mỗi dòng ≤ {QUICK_MAX_QTY_PER_LINE} thanh, tổng ≤{" "}
                    {QUICK_MAX_TOTAL_BARS} thanh/lần.
                  </p>
                  <label className="block space-y-2">
                    <span className="text-sm text-gray-400">Nhà cung cấp (tuỳ chọn)</span>
                    <input
                      value={quickNcc}
                      onChange={(e) => setQuickNcc(e.target.value)}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                      placeholder="VD: Đại lý Xingfa…"
                    />
                  </label>
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 text-gray-400 text-left">
                        <tr>
                          <th className="p-3 font-medium">Vật tư</th>
                          <th className="p-3 font-medium w-32">Dài (mm)</th>
                          <th className="p-3 font-medium w-28">Số thanh</th>
                          <th className="p-3 w-12" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {quickRows.map((row) => (
                          <tr key={row.key}>
                            <td className="p-2">
                              <select
                                value={row.mavt}
                                onChange={(e) => {
                                  const mavt = Number(e.target.value);
                                  const picked = materials.find((m) => m.mavt === mavt);
                                  setQuickRows((rs) =>
                                    rs.map((r) =>
                                      r.key === row.key
                                        ? {
                                            ...r,
                                            mavt,
                                            chieudaibandau: picked?.chieudaimacdinh ?? r.chieudaibandau,
                                          }
                                        : r,
                                    ),
                                  );
                                }}
                                className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-2 py-2 text-gray-200 focus:outline-none focus:border-emerald-500"
                                aria-label="Chọn vật tư"
                              >
                                {materials.map((m) => (
                                  <option key={m.mavt} value={m.mavt}>
                                    VT-{m.mavt} — {m.tenvt}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min={1}
                                value={row.chieudaibandau}
                                onChange={(e) =>
                                  setQuickRows((rs) =>
                                    rs.map((r) =>
                                      r.key === row.key
                                        ? { ...r, chieudaibandau: Number(e.target.value) }
                                        : r,
                                    ),
                                  )
                                }
                                aria-label="Chiều dài thanh (mm)"
                                title="Chiều dài (mm)"
                                className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-2 py-2 text-gray-200 font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min={1}
                                max={QUICK_MAX_QTY_PER_LINE}
                                value={row.quantity}
                                onChange={(e) =>
                                  setQuickRows((rs) =>
                                    rs.map((r) =>
                                      r.key === row.key
                                        ? { ...r, quantity: Number(e.target.value) }
                                        : r,
                                    ),
                                  )
                                }
                                aria-label="Số lượng thanh"
                                title="Số thanh"
                                className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-2 py-2 text-gray-200 font-mono"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeQuickRow(row.key)}
                                className="p-2 text-gray-500 hover:text-red-400 rounded-lg"
                                title="Xóa dòng"
                                aria-label="Xóa dòng"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={addQuickRow}
                    className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    + Thêm dòng vật tư
                  </button>
                </div>
                <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3 bg-[#0a0a0c] shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuickOpen(false)}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Nhập kho ({quickTotalPreview} thanh dự kiến)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Hộp thoại tạo mới */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Inbox className="w-5 h-5 mr-2 text-cyan-400" /> Nhập kho lô phôi
                </h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Chọn vật tư (nhôm thanh)</label>
                  <select
                    value={createForm.mavt}
                    onChange={(e) => {
                      const mavt = Number(e.target.value);
                      const picked = materials.find((m) => m.mavt === mavt);
                      setCreateForm((p) => ({
                        ...p,
                        mavt,
                        chieudaibandau: picked?.chieudaimacdinh ?? p.chieudaibandau,
                      }));
                    }}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                    aria-label="Chọn vật tư"
                  >
                    {materials.map((m) => (
                      <option key={m.mavt} value={m.mavt}>
                        VT-{m.mavt} — {m.tenvt} {m.chieudaimacdinh ? `(${m.chieudaimacdinh}mm)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium">Số lượng thanh</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={createForm.quantity}
                      onChange={(e) => setCreateForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                      aria-label="Số lượng thanh"
                      placeholder="Số lượng"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium">Chiều dài ban đầu (mm)</label>
                    <input
                      type="number"
                      min={1}
                      value={createForm.chieudaibandau}
                      onChange={(e) => setCreateForm((p) => ({ ...p, chieudaibandau: Number(e.target.value) }))}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                      aria-label="Chiều dài ban đầu"
                      placeholder="Chiều dài (mm)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Nhà cung cấp (tuỳ chọn)</label>
                  <input
                    value={createForm.nhacungcap}
                    onChange={(e) => setCreateForm((p) => ({ ...p, nhacungcap: e.target.value }))}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                    placeholder="VD: Xingfa chính hãng..."
                    aria-label="Nhà cung cấp"
                  />
                </div>

                <div className="pt-4 mt-6 border-t border-white/5 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Nhập kho
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Hộp thoại chỉnh sửa */}
        {isEditOpen && editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Edit2 className="w-5 h-5 mr-2 text-blue-400" /> Cập nhật UID-{editing.maphoi.toString().padStart(5, "0")}
                </h3>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-sm text-gray-300">
                  Vật tư: <strong className="text-white">{editing.vattu?.tenvt}</strong>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium">Chiều dài hiện tại (mm)</label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.chieudaihientai}
                      onChange={(e) => setEditForm((p) => ({ ...p, chieudaihientai: Number(e.target.value) }))}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500"
                      aria-label="Chiều dài hiện tại"
                      placeholder="Chiều dài (mm)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium">Trạng thái</label>
                    <select
                      value={editForm.trangthai}
                      onChange={(e) => setEditForm((p) => ({ ...p, trangthai: e.target.value }))}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500"
                      aria-label="Trạng thái phôi"
                    >
                      <option value="MOI">MOI</option>
                      <option value="CON_DU">CON_DU</option>
                      <option value="BO_DI">BO_DI</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-white/5 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title={deleteTarget ? `Xóa UID-${deleteTarget.maphoi.toString().padStart(5, "0")}` : ""}
          description="Chỉ xóa phôi khi đây là dữ liệu nhập sai. Nếu phôi đã lỗi hoặc đã dùng trong sơ đồ cắt, nên chuyển trạng thái Bỏ đi để giữ lịch sử kho."
          confirmLabel="Xóa phôi"
          tone="danger"
          busy={isSubmitting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const item = deleteTarget;
            if (!item) return;
            await handleDelete(item);
            setDeleteTarget(null);
          }}
        />

    </div>
  );
}
