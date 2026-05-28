/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Eye, Loader2, Search, Upload, X } from "lucide-react";
import { apiData, imageDisplayUrl } from "@/lib/api";
import { fileToCompressedImage } from "@/lib/image-upload";
import { formatOrderStatus } from "@/lib/order-status";

type OrderDetail = {
  madh: number;
  ngaytao: string;
  trangthai: string;
  tonggiatri: number;
  khachhang: { hoten: string | null; sdt?: string | null; email?: string | null; diachi?: string | null } | null;
  chitietdh?: { mactdh: number; mota?: string | null; soluong?: number | null }[];
};

type OrderImage = {
  maha: number;
  madh: number;
  duongdan: string;
  url?: string | null;
  mota: string | null;
  loaianh?: "CAT_PHOI" | "HOAN_THANH_CONG_TRINH" | "BAO_CAO_SU_CO" | "KHAC";
  mapc?: number | null;
  masdc?: number | null;
  maphoi?: number | null;
  thoigian: string;
  nguoichup?: number | null;
  nguoidung?: { hoten?: string | null } | null;
};

type CuttingPlan = {
  masdc: number;
  mapc: number;
  khothanhphoi?: { maphoi?: number | null } | null;
};

type ImageViewMode = "GRID" | "LIST" | "SDC" | "TYPE" | "TIMELINE";
type ImageTypeFilter = "ALL" | "CAT_PHOI" | "HOAN_THANH_CONG_TRINH" | "BAO_CAO_SU_CO";
type ImageSortMode = "NEWEST" | "OLDEST";

const IMAGE_TYPE_LABEL: Record<NonNullable<OrderImage["loaianh"]>, string> = {
  CAT_PHOI: "Xác nhận cắt phôi",
  HOAN_THANH_CONG_TRINH: "Hoàn thành công trình",
  BAO_CAO_SU_CO: "Sự cố",
  KHAC: "Khác",
};

const VIEW_OPTIONS: { value: ImageViewMode; label: string }[] = [
  { value: "GRID", label: "Lưới" },
  { value: "LIST", label: "Danh sách" },
  { value: "SDC", label: "Theo phôi/SDC" },
  { value: "TYPE", label: "Theo loại ảnh" },
  { value: "TIMELINE", label: "Dòng thời gian" },
];

const TYPE_FILTERS: { value: ImageTypeFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "CAT_PHOI", label: "Xác nhận cắt phôi" },
  { value: "HOAN_THANH_CONG_TRINH", label: "Hoàn thành công trình" },
  { value: "BAO_CAO_SU_CO", label: "Sự cố" },
];

const TYPE_GROUPS: { value: NonNullable<OrderImage["loaianh"]>; label: string }[] = [
  { value: "CAT_PHOI", label: "Xác nhận cắt phôi / CAT_PHOI" },
  { value: "HOAN_THANH_CONG_TRINH", label: "Hoàn thành công trình / HOAN_THANH_CONG_TRINH" },
  { value: "BAO_CAO_SU_CO", label: "Sự cố / BAO_CAO_SU_CO" },
  { value: "KHAC", label: "Khác" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa rõ thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa rõ thời gian";
  return date.toLocaleString("vi-VN");
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatTimelineDay(value?: string | null) {
  if (!value) return "Chưa rõ ngày";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa rõ ngày";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Hôm nay";
  if (sameDay(date, yesterday)) return "Hôm qua";
  return date.toLocaleDateString("vi-VN");
}

function statusClass(status?: string | null) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "HOAN_THANH") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (normalized === "DANG_GIA_CONG") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if (normalized === "DA_THANH_TOAN") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  if (normalized === "DA_DUYET_GIA") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

function getImageSearchText(image: OrderImage) {
  return [
    IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"],
    image.mota || "",
    image.nguoidung?.hoten || "",
    image.nguoichup ? `user-${image.nguoichup}` : "",
    image.mapc ? `PC-${image.mapc}` : "",
    image.masdc ? `SDC-${image.masdc}` : "",
    image.maphoi ? `UID-${image.maphoi}` : "",
  ]
    .join(" ")
    .toLowerCase();
}

function compareTime(a: OrderImage, b: OrderImage, sortMode: ImageSortMode) {
  const timeA = new Date(a.thoigian).getTime() || 0;
  const timeB = new Date(b.thoigian).getTime() || 0;
  return sortMode === "OLDEST" ? timeA - timeB : timeB - timeA;
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is number => Number.isFinite(Number(value))))).sort((a, b) => a - b);
}

function groupKey(image: OrderImage) {
  return `${image.mapc ?? "none"}-${image.masdc ?? "none"}-${image.maphoi ?? "none"}`;
}

export default function AdminImageArchiveDetailPage() {
  const params = useParams<{ madh: string }>();
  const madh = Number(params.madh);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [images, setImages] = useState<OrderImage[]>([]);
  const [requiredPlans, setRequiredPlans] = useState<CuttingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<OrderImage | null>(null);
  const [viewMode, setViewMode] = useState<ImageViewMode>("GRID");
  const [sortMode, setSortMode] = useState<ImageSortMode>("NEWEST");
  const [typeFilter, setTypeFilter] = useState<ImageTypeFilter>("ALL");
  const [imageQuery, setImageQuery] = useState("");
  const [mapcFilter, setMapcFilter] = useState("ALL");
  const [masdcFilter, setMasdcFilter] = useState("ALL");
  const [maphoiFilter, setMaphoiFilter] = useState("ALL");
  const [replaceBusyId, setReplaceBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(madh) || madh <= 0) {
      setError("Mã đơn hàng không hợp lệ.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [orderData, imageRows] = await Promise.all([
        apiData<OrderDetail>(`/api/admin/orders/${madh}`),
        apiData<OrderImage[]>(`/api/admin/images/order/${madh}`).catch(() => []),
      ]);
      setOrder(orderData);
      setImages(imageRows);

      const mapcs = uniqueNumbers(imageRows.map((image) => image.mapc));
      const planRows = mapcs.length
        ? (await Promise.all(
            mapcs.map((mapc) => apiData<CuttingPlan[]>(`/api/admin/cutting-plans/assignment/${mapc}`).catch(() => [])),
          )).flat()
        : [];
      setRequiredPlans(planRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được ảnh đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [madh]);

  useEffect(() => {
    void load();
  }, [load]);

  const replaceImageFile = async (image: OrderImage, file?: File | null) => {
    if (!file) return;
    setReplaceBusyId(image.maha);
    setError("");
    try {
      const compressed = await fileToCompressedImage(file);
      const formData = new FormData();
      formData.set("image", compressed.blob, `image-${image.maha}.jpg`);

      const updated = await apiData<OrderImage>(`/api/admin/images/${image.maha}/file`, {
        method: "PATCH",
        body: formData,
      });

      setImages((current) => current.map((row) => (row.maha === updated.maha ? updated : row)));
      setSelectedImage(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong thay duoc anh.");
    } finally {
      setReplaceBusyId(null);
    }
  };

  const mapcOptions = useMemo(() => uniqueNumbers(images.map((image) => image.mapc)), [images]);
  const masdcOptions = useMemo(() => uniqueNumbers(images.map((image) => image.masdc).concat(requiredPlans.map((plan) => plan.masdc))), [images, requiredPlans]);
  const maphoiOptions = useMemo(
    () => uniqueNumbers(images.map((image) => image.maphoi).concat(requiredPlans.map((plan) => plan.khothanhphoi?.maphoi))),
    [images, requiredPlans],
  );

  const visibleImages = useMemo(() => {
    const keyword = imageQuery.trim().toLowerCase();
    return images
      .filter((image) => typeFilter === "ALL" || image.loaianh === typeFilter)
      .filter((image) => mapcFilter === "ALL" || image.mapc === Number(mapcFilter))
      .filter((image) => masdcFilter === "ALL" || image.masdc === Number(masdcFilter))
      .filter((image) => maphoiFilter === "ALL" || image.maphoi === Number(maphoiFilter))
      .filter((image) => !keyword || getImageSearchText(image).includes(keyword))
      .sort((a, b) => compareTime(a, b, sortMode));
  }, [imageQuery, images, mapcFilter, maphoiFilter, masdcFilter, sortMode, typeFilter]);

  const completionCount = useMemo(() => images.filter((image) => image.loaianh === "HOAN_THANH_CONG_TRINH").length, [images]);
  const cutPhotoCount = useMemo(() => images.filter((image) => image.loaianh === "CAT_PHOI").length, [images]);

  const sdcGroups = useMemo(() => {
    const groups = new Map<string, { mapc: number | null; masdc: number | null; maphoi: number | null; images: OrderImage[] }>();

    for (const plan of requiredPlans) {
      if (mapcFilter !== "ALL" && plan.mapc !== Number(mapcFilter)) continue;
      if (masdcFilter !== "ALL" && plan.masdc !== Number(masdcFilter)) continue;
      const maphoi = plan.khothanhphoi?.maphoi ?? null;
      if (maphoiFilter !== "ALL" && maphoi !== Number(maphoiFilter)) continue;
      const key = `${plan.mapc}-${plan.masdc}-${maphoi ?? "none"}`;
      groups.set(key, { mapc: plan.mapc, masdc: plan.masdc, maphoi, images: [] });
    }

    for (const image of visibleImages) {
      const key = groupKey(image);
      const current = groups.get(key) ?? { mapc: image.mapc ?? null, masdc: image.masdc ?? null, maphoi: image.maphoi ?? null, images: [] };
      current.images.push(image);
      groups.set(key, current);
    }

    return Array.from(groups.values()).sort((a, b) => {
      const pc = (a.mapc ?? Number.MAX_SAFE_INTEGER) - (b.mapc ?? Number.MAX_SAFE_INTEGER);
      if (pc !== 0) return pc;
      return (a.masdc ?? Number.MAX_SAFE_INTEGER) - (b.masdc ?? Number.MAX_SAFE_INTEGER);
    });
  }, [mapcFilter, maphoiFilter, masdcFilter, requiredPlans, visibleImages]);

  const typeGroups = useMemo(
    () =>
      TYPE_GROUPS.map((group) => ({
        ...group,
        images: visibleImages.filter((image) => (image.loaianh ?? "KHAC") === group.value),
      })),
    [visibleImages],
  );

  const timelineGroups = useMemo(() => {
    const groups = new Map<string, OrderImage[]>();
    for (const image of visibleImages) {
      const key = formatTimelineDay(image.thoigian);
      groups.set(key, [...(groups.get(key) ?? []), image]);
    }
    return Array.from(groups.entries()).map(([label, rows]) => ({ label, images: rows }));
  }, [visibleImages]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Link href="/admin/kho-anh" className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 transition hover:border-cyan-500/50 hover:text-cyan-200" title="Quay lại Kho ảnh" aria-label="Quay lại Kho ảnh">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">Kho ảnh DH-{madh}</h1>
                {order && (
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(order.trangthai)}`}>
                    {formatOrderStatus(order.trangthai)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                {order?.khachhang?.hoten || "Đang tải thông tin khách hàng"} · {order ? formatDateTime(order.ngaytao) : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
            >
              Tải lại
            </button>
            <Link href={`/admin/don-hang/${madh}`} className="inline-flex items-center justify-center rounded-xl bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25">
              <ExternalLink className="mr-2 h-4 w-4" />
              Chi tiết đơn hàng
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải ảnh đơn hàng...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Stat label="Tổng ảnh" value={`${images.length}`} />
            <Stat label="Ảnh hoàn thành" value={`${completionCount}`} />
            <Stat label="Ảnh cắt phôi" value={`${cutPhotoCount}`} />
            <Stat label="Đang hiển thị" value={`${visibleImages.length}`} />
          </section>

          {completionCount === 0 && cutPhotoCount > 0 && (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
              Đơn này đã có {cutPhotoCount} ảnh xác nhận cắt phôi. Chưa có ảnh hoàn thành công trình Phase 2.
            </div>
          )}

          <ImageToolbar
            viewMode={viewMode}
            setViewMode={setViewMode}
            sortMode={sortMode}
            setSortMode={setSortMode}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            imageQuery={imageQuery}
            setImageQuery={setImageQuery}
            mapcFilter={mapcFilter}
            setMapcFilter={setMapcFilter}
            mapcOptions={mapcOptions}
            masdcFilter={masdcFilter}
            setMasdcFilter={setMasdcFilter}
            masdcOptions={masdcOptions}
            maphoiFilter={maphoiFilter}
            setMaphoiFilter={setMaphoiFilter}
            maphoiOptions={maphoiOptions}
          />

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Hình ảnh đơn hàng</h2>
                <p className="mt-1 text-sm text-zinc-500">Đổi chế độ xem để kiểm tra ảnh theo mục đích khác nhau.</p>
              </div>
              <span className="w-fit rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-xs font-bold text-zinc-200">
                {visibleImages.length} ảnh
              </span>
            </div>

            {visibleImages.length === 0 && viewMode !== "SDC" ? (
              <EmptyImageState text="Không có ảnh phù hợp với bộ lọc hiện tại." />
            ) : viewMode === "GRID" ? (
              <ImageGrid images={visibleImages} onOpen={setSelectedImage} />
            ) : viewMode === "LIST" ? (
              <ImageList images={visibleImages} onOpen={setSelectedImage} />
            ) : viewMode === "SDC" ? (
              <SdcGroupedView groups={sdcGroups} onOpen={setSelectedImage} />
            ) : viewMode === "TYPE" ? (
              <TypeGroupedView groups={typeGroups} onOpen={setSelectedImage} />
            ) : (
              <TimelineView groups={timelineGroups} onOpen={setSelectedImage} />
            )}
          </section>
        </>
      )}

      {selectedImage && (
        <ImageLightbox
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onReplace={(file) => void replaceImageFile(selectedImage, file)}
          replaceBusy={replaceBusyId === selectedImage.maha}
        />
      )}
    </div>
  );
}

function ImageToolbar({
  viewMode,
  setViewMode,
  sortMode,
  setSortMode,
  typeFilter,
  setTypeFilter,
  imageQuery,
  setImageQuery,
  mapcFilter,
  setMapcFilter,
  mapcOptions,
  masdcFilter,
  setMasdcFilter,
  masdcOptions,
  maphoiFilter,
  setMaphoiFilter,
  maphoiOptions,
}: {
  viewMode: ImageViewMode;
  setViewMode: (value: ImageViewMode) => void;
  sortMode: ImageSortMode;
  setSortMode: (value: ImageSortMode) => void;
  typeFilter: ImageTypeFilter;
  setTypeFilter: (value: ImageTypeFilter) => void;
  imageQuery: string;
  setImageQuery: (value: string) => void;
  mapcFilter: string;
  setMapcFilter: (value: string) => void;
  mapcOptions: number[];
  masdcFilter: string;
  setMasdcFilter: (value: string) => void;
  masdcOptions: number[];
  maphoiFilter: string;
  setMaphoiFilter: (value: string) => void;
  maphoiOptions: number[];
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-zinc-500">Chế độ xem</div>
          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setViewMode(option.value)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  viewMode === option.value
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-100"
                    : "border-zinc-800 bg-black/30 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_180px_140px_140px_140px]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Tìm trong ảnh</span>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-black/40 px-3 py-2.5">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                value={imageQuery}
                onChange={(event) => setImageQuery(event.target.value)}
                placeholder="Người chụp, SDC, UID, ghi chú..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
          </label>

          <SelectControl
            label="Sắp xếp"
            value={sortMode}
            onChange={(value) => setSortMode(value as ImageSortMode)}
            options={[
              { value: "NEWEST", label: "Mới nhất trước" },
              { value: "OLDEST", label: "Cũ nhất trước" },
            ]}
          />
          <SelectControl label="Lọc nhanh" value={typeFilter} onChange={(value) => setTypeFilter(value as ImageTypeFilter)} options={TYPE_FILTERS} />
          <SelectControl label="PC/mapc" value={mapcFilter} onChange={setMapcFilter} options={[{ value: "ALL", label: "Tất cả PC" }, ...mapcOptions.map((value) => ({ value: String(value), label: `PC-${value}` }))]} />
          <SelectControl label="SDC/masdc" value={masdcFilter} onChange={setMasdcFilter} options={[{ value: "ALL", label: "Tất cả SDC" }, ...masdcOptions.map((value) => ({ value: String(value), label: `SDC-${value}` }))]} />
          <SelectControl label="UID/maphoi" value={maphoiFilter} onChange={setMaphoiFilter} options={[{ value: "ALL", label: "Tất cả UID" }, ...maphoiOptions.map((value) => ({ value: String(value), label: `UID-${value}` }))]} />
        </div>
      </div>
    </section>
  );
}

function SelectControl({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-[42px] w-full rounded-xl border border-zinc-800 bg-black/40 px-3 text-sm font-semibold text-white outline-none">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ImageGrid({ images, onOpen }: { images: OrderImage[]; onOpen: (image: OrderImage) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {images.map((image) => (
        <ImageCard key={image.maha} image={image} onOpen={onOpen} />
      ))}
    </div>
  );
}

function ImageCard({ image, onOpen, compact = false }: { image: OrderImage; onOpen: (image: OrderImage) => void; compact?: boolean }) {
  const viewUrl = imageDisplayUrl(image);
  return (
    <button
      type="button"
      onClick={() => onOpen(image)}
      className="overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 text-left transition hover:border-cyan-500/50"
    >
      {viewUrl ? (
        <img src={viewUrl} alt={image.mota || IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]} className={`${compact ? "aspect-video" : "aspect-[4/3]"} w-full object-cover`} />
      ) : (
        <ImageUnavailable className={compact ? "aspect-video" : "aspect-[4/3]"} />
      )}
      <div className="space-y-2 p-3 text-xs text-zinc-400">
        <ImageBadges image={image} />
        <div className="truncate font-semibold text-zinc-100">{image.mota || "Ảnh đơn hàng"}</div>
        <div className="truncate">{formatDateTime(image.thoigian)}</div>
      </div>
    </button>
  );
}

function ImageBadges({ image }: { image: OrderImage }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 font-bold text-cyan-200">
        {IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]}
      </span>
      {image.mapc ? <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono">PC-{image.mapc}</span> : null}
      {image.masdc ? <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono">SDC-{image.masdc}</span> : null}
      {image.maphoi ? <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 font-mono text-amber-200">UID-{image.maphoi}</span> : null}
    </div>
  );
}

function ImageList({ images, onOpen }: { images: OrderImage[]; onOpen: (image: OrderImage) => void }) {
  return (
    <div className="space-y-3">
      {images.map((image) => (
        <article key={image.maha} className="grid gap-4 rounded-2xl border border-zinc-800 bg-black/25 p-3 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-center">
          <button type="button" onClick={() => onOpen(image)} className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
            {imageDisplayUrl(image) ? (
              <img src={imageDisplayUrl(image) || ""} alt={image.mota || IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]} className="aspect-video w-full object-cover" />
            ) : (
              <ImageUnavailable className="aspect-video" />
            )}
          </button>
          <div className="min-w-0 space-y-2">
            <ImageBadges image={image} />
            <div className="font-semibold text-white">{image.mota || "Ảnh đơn hàng"}</div>
            <div className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-2 lg:grid-cols-3">
              <span>Người chụp: <strong className="text-zinc-200">{image.nguoidung?.hoten || image.nguoichup || "Chưa rõ"}</strong></span>
              <span>Thời gian: <strong className="text-zinc-200">{formatDateTime(image.thoigian)}</strong></span>
              <span>Loại: <strong className="text-zinc-200">{IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]}</strong></span>
              <span>PC: <strong className="text-zinc-200">{image.mapc ?? "—"}</strong></span>
              <span>SDC: <strong className="text-zinc-200">{image.masdc ?? "—"}</strong></span>
              <span>UID: <strong className="text-zinc-200">{image.maphoi ?? "—"}</strong></span>
            </div>
          </div>
          <button type="button" onClick={() => onOpen(image)} className="inline-flex items-center justify-center rounded-xl bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/25">
            <Eye className="mr-2 h-4 w-4" />
            Xem ảnh
          </button>
        </article>
      ))}
    </div>
  );
}

function SdcGroupedView({ groups, onOpen }: { groups: { mapc: number | null; masdc: number | null; maphoi: number | null; images: OrderImage[] }[]; onOpen: (image: OrderImage) => void }) {
  if (groups.length === 0) return <EmptyImageState text="Không có SDC/phôi phù hợp với bộ lọc hiện tại." />;
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const hasCutPhoto = group.images.some((image) => image.loaianh === "CAT_PHOI");
        return (
          <section key={`${group.mapc}-${group.masdc}-${group.maphoi}`} className="rounded-2xl border border-zinc-800 bg-black/25 p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-white">SDC-{group.masdc ?? "—"} · UID-{group.maphoi ?? "—"}</h3>
                <p className="mt-1 text-xs text-zinc-500">PC-{group.mapc ?? "—"} · {group.images.length} ảnh</p>
              </div>
              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${hasCutPhoto ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
                {hasCutPhoto ? "Đã có ảnh xác nhận" : "Chưa có ảnh"}
              </span>
            </div>
            {group.images.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-center text-sm text-zinc-500">Chưa có ảnh xác nhận cắt</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
                {group.images.map((image) => (
                  <ThumbButton key={image.maha} image={image} onOpen={onOpen} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TypeGroupedView({ groups, onOpen }: { groups: { value: NonNullable<OrderImage["loaianh"]>; label: string; images: OrderImage[] }[]; onOpen: (image: OrderImage) => void }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.value} className="rounded-2xl border border-zinc-800 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">{group.label}</h3>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-200">{group.images.length} ảnh</span>
          </div>
          {group.images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-center text-sm text-zinc-500">Không có ảnh thuộc nhóm này.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
              {group.images.map((image) => (
                <ThumbButton key={image.maha} image={image} onOpen={onOpen} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function TimelineView({ groups, onOpen }: { groups: { label: string; images: OrderImage[] }[]; onOpen: (image: OrderImage) => void }) {
  if (groups.length === 0) return <EmptyImageState text="Không có ảnh phù hợp với bộ lọc hiện tại." />;
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">{group.label}</h3>
          <div className="space-y-2 border-l border-zinc-800 pl-4">
            {group.images.map((image) => (
              <article key={image.maha} className="grid gap-3 rounded-2xl border border-zinc-800 bg-black/25 p-3 md:grid-cols-[92px_minmax(0,1fr)_auto] md:items-center">
                <button type="button" onClick={() => onOpen(image)} className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
                  {imageDisplayUrl(image) ? (
                    <img src={imageDisplayUrl(image) || ""} alt={image.mota || IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]} className="aspect-video w-full object-cover" />
                  ) : (
                    <ImageUnavailable className="aspect-video" />
                  )}
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">{formatTime(image.thoigian)} · {IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]}</div>
                  <div className="mt-1 text-sm text-zinc-400">{image.nguoidung?.hoten || image.nguoichup || "Chưa rõ người chụp"}</div>
                  <div className="mt-2 text-xs text-zinc-500">PC-{image.mapc ?? "—"} · SDC-{image.masdc ?? "—"} · UID-{image.maphoi ?? "—"}</div>
                </div>
                <button type="button" onClick={() => onOpen(image)} className="rounded-xl border border-zinc-800 px-3 py-2 text-sm font-bold text-zinc-200 hover:border-cyan-500/50">Xem ảnh</button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ThumbButton({ image, onOpen }: { image: OrderImage; onOpen: (image: OrderImage) => void }) {
  const viewUrl = imageDisplayUrl(image);
  return (
    <button type="button" onClick={() => onOpen(image)} className="overflow-hidden rounded-xl border border-zinc-800 bg-black/30 text-left hover:border-cyan-500/50">
      {viewUrl ? (
        <img src={viewUrl} alt={image.mota || IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]} className="aspect-video w-full object-cover" />
      ) : (
        <ImageUnavailable className="aspect-video" />
      )}
      <div className="truncate px-2 py-1.5 text-[11px] font-semibold text-zinc-300">{formatTime(image.thoigian)} · {IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]}</div>
    </button>
  );
}

function ImageLightbox({
  image,
  onClose,
  onReplace,
  replaceBusy,
}: {
  image: OrderImage;
  onClose: () => void;
  onReplace: (file?: File | null) => void;
  replaceBusy: boolean;
}) {
  const viewUrl = imageDisplayUrl(image);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-white">
              <Eye className="h-4 w-4 text-cyan-300" />
              {IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">DH-{image.madh} · PC-{image.mapc ?? "—"} · SDC-{image.masdc ?? "—"} · UID-{image.maphoi ?? "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/20 ${replaceBusy ? "pointer-events-none opacity-60" : ""}`}>
              {replaceBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Thay ảnh
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={replaceBusy}
                onChange={(event) => {
                  onReplace(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <button type="button" onClick={onClose} className="text-zinc-500 transition hover:text-white" title="Đóng" aria-label="Đóng">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="space-y-4 overflow-y-auto p-4">
          {viewUrl ? (
            <img src={viewUrl} alt={image.mota || IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]} className="max-h-[62dvh] w-full rounded-xl border border-zinc-800 bg-black object-contain" />
          ) : (
            <ImageUnavailable className="min-h-72" />
          )}
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Meta label="Người chụp" value={image.nguoidung?.hoten || image.nguoichup || "Chưa rõ"} />
            <Meta label="Thời gian" value={formatDateTime(image.thoigian)} />
            <Meta label="Loại ảnh" value={IMAGE_TYPE_LABEL[image.loaianh ?? "KHAC"]} />
            <Meta label="PC/mapc" value={image.mapc ?? "—"} />
            <Meta label="SDC/masdc" value={image.masdc ?? "—"} />
            <Meta label="UID/maphoi" value={image.maphoi ?? "—"} />
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs leading-relaxed text-cyan-100">
            Thay ảnh chỉ đổi file hiển thị, vẫn giữ nguyên đơn hàng, PC, SDC, UID và loại ảnh của record này.
          </div>
          {image.mota && <div className="rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">{image.mota}</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function EmptyImageState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 px-4 py-8 text-center text-sm text-zinc-500">{text}</div>;
}

function ImageUnavailable({ className = "" }: { className?: string }) {
  return <div className={`flex items-center justify-center bg-black/40 px-3 text-center text-xs font-semibold text-zinc-500 ${className}`}>Ảnh không tải được</div>;
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/30 px-3 py-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  );
}
