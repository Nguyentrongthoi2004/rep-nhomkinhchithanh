"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Cpu,
  CreditCard,
  FolderCode,
  HelpCircle,
  Info,
  Loader2,
  Package,
  Recycle,
  Ruler,
  Save,
  Scissors,
  Settings2,
  ShieldAlert,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { apiData, apiJson } from "@/lib/api";

type Rule = {
  maqt: string;
  tenqt: string;
  giatri: number;
};

type TabId = "setup" | "labor" | "materials" | "score" | "payments";

type CodeRef = {
  label: string;
  path: string;
  note: string;
};

const tabs: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: "setup", label: "Thông số cắt", icon: <Settings2 className="h-4 w-4" /> },
  { id: "labor", label: "Nhân công", icon: <Calculator className="h-4 w-4" /> },
  { id: "materials", label: "Vật tư", icon: <Package className="h-4 w-4" /> },
  { id: "score", label: "Score tối ưu", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "payments", label: "Thanh toán & duyệt", icon: <CreditCard className="h-4 w-4" /> },
];

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [kerf, setKerf] = useState(5);
  const [safeMargin, setSafeMargin] = useState(20);
  const [minScrap, setMinScrap] = useState(100);
  const [minReusable, setMinReusable] = useState(1500);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isInvalidConfig = minReusable <= minScrap;
  const smallScrapMinScore = Math.round(1200 - minScrap * 0.02);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const rules = await apiData<Rule[]>("/api/admin/rules");
      setKerf(Number(rules.find((r) => r.maqt === "BLADE_KERF")?.giatri ?? 5));
      setSafeMargin(Number(rules.find((r) => r.maqt === "SAFE_MARGIN")?.giatri ?? 20));
      setMinScrap(Number(rules.find((r) => r.maqt === "MIN_SCRAP")?.giatri ?? 100));
      setMinReusable(Number(rules.find((r) => r.maqt === "MIN_REUSABLE_LENGTH")?.giatri ?? 1500));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        apiJson("/api/admin/rules/BLADE_KERF", {
          method: "PUT",
          body: JSON.stringify({ tenqt: "Độ hở lưỡi cưa", giatri: kerf }),
        }),
        apiJson("/api/admin/rules/SAFE_MARGIN", {
          method: "PUT",
          body: JSON.stringify({ tenqt: "Lề an toàn biên", giatri: safeMargin }),
        }),
        apiJson("/api/admin/rules/MIN_SCRAP", {
          method: "PUT",
          body: JSON.stringify({ tenqt: "Ngưỡng phế liệu tối đa", giatri: minScrap }),
        }),
        apiJson("/api/admin/rules/MIN_REUSABLE_LENGTH", {
          method: "PUT",
          body: JSON.stringify({ tenqt: "Chiều dài tối thiểu tái sử dụng phôi dư", giatri: minReusable }),
        }),
      ]);
      loadRules();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const scoreContext = useMemo(
    () => ({
      kerf,
      safeMargin,
      minScrap,
      minReusable,
      smallScrapMinScore,
    }),
    [kerf, minReusable, minScrap, safeMargin, smallScrapMinScore],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-100">
            <Cpu className="mr-3 h-6 w-6 text-blue-500" />
            Cấu hình chi tiết hệ thống
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Khu vực quản trị quy tắc tính toán quan trọng: cắt phôi, báo giá, nhân công, vật tư, score và thanh toán.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || loading || isInvalidConfig}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lưu thông số cắt
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0a0c] p-2">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                activeTab === tab.id ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isInvalidConfig && (
        <div className="flex items-start rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="mr-3 mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div>
            <span className="font-bold">Lỗi cấu hình:</span> Chiều dài tối thiểu tái sử dụng phôi dư ({minReusable} mm) phải lớn hơn ngưỡng phế liệu tối đa ({minScrap} mm).
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === "setup" && (
            <SetupTab
              kerf={kerf}
              safeMargin={safeMargin}
              minScrap={minScrap}
              minReusable={minReusable}
              setKerf={setKerf}
              setSafeMargin={setSafeMargin}
              setMinScrap={setMinScrap}
              setMinReusable={setMinReusable}
            />
          )}

          {activeTab === "labor" && <LaborTab />}
          {activeTab === "materials" && <MaterialsTab />}
          {activeTab === "score" && <ScoreTab context={scoreContext} />}
          {activeTab === "payments" && <PaymentsTab />}
        </>
      )}
    </div>
  );
}

function SetupTab({
  kerf,
  safeMargin,
  minScrap,
  minReusable,
  setKerf,
  setSafeMargin,
  setMinScrap,
  setMinReusable,
}: {
  kerf: number;
  safeMargin: number;
  minScrap: number;
  minReusable: number;
  setKerf: (value: number) => void;
  setSafeMargin: (value: number) => void;
  setMinScrap: (value: number) => void;
  setMinReusable: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <NumberCard
        icon={<Ruler className="h-6 w-6 text-blue-400" />}
        title="Độ hở lưỡi cưa"
        desc="Phần nhôm bị hao sau mỗi nhát cắt, thường gọi là kerf."
        value={kerf}
        onChange={setKerf}
        min={0}
        max={20}
      />
      <NumberCard
        icon={<ShieldAlert className="h-6 w-6 text-red-400" />}
        title="Lề an toàn"
        desc="Phần chừa ở hai đầu thanh phôi để kẹp máy và tránh cắt sát biên."
        value={safeMargin}
        onChange={setSafeMargin}
        min={0}
        max={100}
      />
      <NumberCard
        icon={<Trash2 className="h-6 w-6 text-amber-400" />}
        title="Ngưỡng phế liệu tối đa"
        desc="Phần dư nhỏ hơn ngưỡng này được xem là tận dụng gần hết phôi."
        value={minScrap}
        onChange={setMinScrap}
        min={0}
        max={500}
      />
      <NumberCard
        icon={<Recycle className="h-6 w-6 text-emerald-400" />}
        title="Tối thiểu tái sử dụng"
        desc="Phần dư lớn hơn hoặc bằng ngưỡng này được giữ lại làm phôi dư."
        value={minReusable}
        onChange={setMinReusable}
        min={100}
        max={5000}
      />
    </div>
  );
}

function LaborTab() {
  return (
    <RuleTabShell
      icon={<Calculator className="h-6 w-6 text-emerald-400" />}
      title="Quy tắc tính tiền nhân công"
      subtitle="Nhân công được tách riêng khỏi lợi nhuận để báo giá nhìn đúng nghiệp vụ hơn."
      refs={[
        { label: "Helper công thức", path: "FE/src/lib/quote-pricing.ts", note: "Tính gia công, kính/tấm, lắp đặt và khảo sát." },
        { label: "Trang lập BOM", path: "FE/src/app/admin/don-hang/[id]/bom/page.tsx", note: "Hiển thị breakdown nhân công trước khi lưu báo giá." },
        { label: "Trang báo giá", path: "FE/src/app/admin/don-hang/[id]/bao-gia/page.tsx", note: "Đọc lại breakdown để in/gửi báo giá." },
      ]}
    >
      <FormulaBlock
        title="Công thức tổng"
        formula="Nhân công = Gia công xưởng + Xử lý kính/tấm + Lắp đặt + Khảo sát/di chuyển"
        rows={[
          ["Gia công xưởng", "Tổng mét dài thanh nhôm x 32.000đ/m"],
          ["Xử lý kính/tấm", "Tổng diện tích kính/tấm x 25.000đ/m²"],
          ["Lắp đặt", "max(diện tích công trình, diện tích kính) x 120.000đ/m²"],
          ["Khảo sát / di chuyển", "150.000đ nếu đơn có phạm vi sản xuất"],
          ["Tổng báo giá", "(Tổng vật tư + Tổng nhân công) x (1 + % lợi nhuận)"],
        ]}
      />
      <ExplainCard tone="emerald" title="Ý nghĩa khi vấn đáp">
        Phần nhân công không còn là một số m² chung chung. Hệ thống tách theo công đoạn thực tế của xưởng: cắt/gia công nhôm, xử lý kính hoặc tấm, lắp đặt tại công trình và chi phí khảo sát/di chuyển.
      </ExplainCard>
    </RuleTabShell>
  );
}

function MaterialsTab() {
  return (
    <RuleTabShell
      icon={<Package className="h-6 w-6 text-sky-400" />}
      title="Quy tắc tính tiền vật tư"
      subtitle="Vật tư được tính từ master-data, sau đó đóng băng đơn giá vào BOM để giữ lịch sử báo giá."
      refs={[
        { label: "Backend đơn hàng", path: "BE/src/modules/orders/orders.service.ts", note: "Tính đơn giá từ vật tư master khi tạo/sửa BOM." },
        { label: "Schema đơn hàng", path: "BE/src/modules/orders/orders.schema.ts", note: "Chặn payload không hợp lệ từ frontend." },
        { label: "Trang vật tư", path: "FE/src/app/admin/vat-tu/page.tsx", note: "Quản lý giá nhập, giá bán, chiều dài mặc định." },
        { label: "Trang BOM", path: "FE/src/app/admin/don-hang/[id]/bom/page.tsx", note: "Tạm tính dòng vật tư trước khi lưu." },
      ]}
    >
      <FormulaBlock
        title="Công thức theo loại vật tư"
        formula="Thành tiền dòng = Đơn giá đã đóng băng x Số lượng"
        rows={[
          ["Giá gốc", "Ưu tiên dongiaban, nếu chưa có thì dùng dongianhap"],
          ["Thanh nhôm", "Đơn giá = giá gốc x chiều dài cắt / chiều dài mặc định"],
          ["Kính / tấm", "Đơn giá = giá gốc x rộng x cao / 1.000.000"],
          ["Theo món", "Đơn giá = giá gốc"],
          ["Đóng băng giá", "Lưu vào chitietdh.dongiadongbang và chitietdh.thanhtien"],
        ]}
      />
      <ExplainCard tone="sky" title="Điểm quan trọng">
        Backend vẫn là nơi tính lại đơn giá từ master-data khi cần, nên báo giá không phụ thuộc hoàn toàn vào số frontend gửi lên. Khi đã lưu BOM, đơn giá dòng được đóng băng để sau này giá vật tư thay đổi vẫn không làm lệch đơn cũ.
      </ExplainCard>
    </RuleTabShell>
  );
}

function ScoreTab({ context }: { context: { kerf: number; safeMargin: number; minScrap: number; minReusable: number; smallScrapMinScore: number } }) {
  return (
    <RuleTabShell
      icon={<Scissors className="h-6 w-6 text-orange-400" />}
      title="Quy tắc score tối ưu cắt phôi"
      subtitle={`Đang dùng kerf ${context.kerf} mm, lề an toàn ${context.safeMargin} mm, phế liệu < ${context.minScrap} mm, tái sử dụng >= ${context.minReusable} mm.`}
      refs={[
        { label: "Thuật toán backend", path: "BE/src/modules/cutting-plans/cutting-plans.service.ts", note: "scoreRemainder, scoreCandidateBar, planCuts." },
        { label: "Màn tối ưu cắt", path: "FE/src/app/admin/toi-uu-cat/[mapc]/page.tsx", note: "Hiển thị sơ đồ, metric và score tham khảo." },
        { label: "Màn đề xuất cắt", path: "FE/src/app/admin/de-xuat-cat/page.tsx", note: "So sánh score cũ/mới khi thợ gửi đề xuất." },
        { label: "Cấu hình rules", path: "BE/src/modules/rules/rules.service.ts", note: "Lưu BLADE_KERF, SAFE_MARGIN, MIN_SCRAP, MIN_REUSABLE_LENGTH." },
      ]}
    >
      <FormulaBlock
        title="Công thức score"
        formula="Score = Điểm phần dư + Điểm dọn kho + Điểm gom mảnh - Điểm phạt rủi ro - Tie-break phần dư"
        rows={[
          ["Phế liệu nhỏ", `Nếu phần dư < ${context.minScrap} mm: 1200 - phần_dư x 0.02`],
          ["Phôi dư tái sử dụng", `Nếu phần dư >= ${context.minReusable} mm: 700 + min(phần_dư / 25, 350)`],
          ["Phôi dư lỡ cỡ", `Từ ${context.minScrap} đến dưới ${context.minReusable} mm: -850 - ratio x 450`],
          ["Ưu tiên dọn kho", "Dùng phôi cũ CON_DU: cộng thêm 120 điểm"],
          ["Gom mảnh", "Nếu phần dư còn chứa được mảnh BOM tiếp theo: cộng thêm 240 điểm"],
          ["Bảo vệ cây dài", "Phạt 6000 điểm nếu dùng cây dài duy nhất trong kho không hợp lý"],
          ["Tie-break", "Trừ phần_dư x 0.01 để ưu tiên phương án khít hơn"],
        ]}
      />
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-300">
            <tr>
              <th className="p-3">Loại phần dư</th>
              <th className="p-3">Điều kiện</th>
              <th className="p-3">Ý nghĩa</th>
              <th className="p-3 text-right">Tác động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-400">
            <tr>
              <td className="p-3 font-bold text-emerald-300">Phế liệu nhỏ</td>
              <td className="p-3 font-mono">&lt; {context.minScrap} mm</td>
              <td className="p-3">Tận dụng gần hết cây phôi.</td>
              <td className="p-3 text-right text-emerald-300">+1200 đến +{context.smallScrapMinScore}</td>
            </tr>
            <tr>
              <td className="p-3 font-bold text-sky-300">Tái sử dụng</td>
              <td className="p-3 font-mono">&gt;= {context.minReusable} mm</td>
              <td className="p-3">Giữ lại làm phôi dư cho đơn sau.</td>
              <td className="p-3 text-right text-sky-300">+700 đến +1050</td>
            </tr>
            <tr>
              <td className="p-3 font-bold text-amber-300">Lỡ cỡ</td>
              <td className="p-3 font-mono">{context.minScrap} - {context.minReusable - 1} mm</td>
              <td className="p-3">Khó dùng lại, dễ làm chật kho.</td>
              <td className="p-3 text-right text-red-300">-850 đến -1300</td>
            </tr>
          </tbody>
        </table>
      </div>
    </RuleTabShell>
  );
}

function PaymentsTab() {
  return (
    <RuleTabShell
      icon={<CreditCard className="h-6 w-6 text-violet-400" />}
      title="Quy tắc thanh toán, duyệt giá và hoàn thành"
      subtitle="Các bước tiền và trạng thái được tách khỏi email để tránh hiểu nhầm: email là gửi báo giá/biên nhận, không phải thanh toán."
      refs={[
        { label: "Thanh toán backend", path: "BE/src/modules/payments/payments.service.ts", note: "Tính đã trả, còn nợ, chống thanh toán vượt tổng." },
        { label: "Schema thanh toán", path: "BE/src/modules/payments/payments.schema.ts", note: "Loại giao dịch và phương thức thanh toán." },
        { label: "Email báo giá", path: "BE/src/modules/emails/emails.routes.ts", note: "Gửi email rồi đánh dấu báo giá đã gửi." },
        { label: "Duyệt giá đơn", path: "BE/src/modules/orders/orders.service.ts", note: "Chỉ duyệt giá sau khi đã gửi báo giá." },
        { label: "Hoàn thành cắt", path: "BE/src/modules/cutting-plans/cutting-plans.service.ts", note: "Trừ kho trong completePlan, không trừ kho lúc tạo sơ đồ." },
      ]}
    >
      <FormulaBlock
        title="Quy tắc nghiệp vụ"
        formula="Trạng thái thanh toán = tổng giao dịch hợp lệ so với tổng giá trị đơn hàng"
        rows={[
          ["Gửi báo giá", "Email ghi nhận baogia_gui_luc và baogia_email, mở khóa bước duyệt giá"],
          ["Duyệt giá", "Chỉ cho duyệt khi khách đã nhận/xác nhận báo giá"],
          ["Đặt cọc", "Giao dịch DAT_COC chuyển đơn sang trạng thái đã cọc"],
          ["Hoàn tất", "Khi tổng đã trả >= tonggiatri, giao dịch hiệu lực là HOAN_TAT"],
          ["Chống vượt tiền", "Backend không cho ghi nhận số tiền lớn hơn công nợ còn lại"],
          ["Trừ kho", "Không trừ kho khi lập sơ đồ; chỉ trừ khi thợ hoàn thành luồng completePlan"],
        ]}
      />
      <ExplainCard tone="violet" title="Có thể nâng tiếp">
        Có thể thêm VietQR ở bước báo giá hoặc thanh toán. QR nên sinh theo mã đơn, số tiền cọc/còn lại và nội dung chuyển khoản; sau đó vẫn ghi nhận là chuyển khoản nếu chưa tích hợp webhook ngân hàng.
      </ExplainCard>
    </RuleTabShell>
  );
}

function RuleTabShell({ icon, title, subtitle, refs, children }: { icon: ReactNode; title: string; subtitle: string; refs: CodeRef[]; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-5 rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">{icon}</div>
          <div>
            <h2 className="text-xl font-bold text-gray-100">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-400">{subtitle}</p>
          </div>
        </div>
        {children}
      </section>

      <aside className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
          <FolderCode className="h-4 w-4 text-blue-400" />
          Thư mục code liên quan
        </div>
        <div className="mt-4 space-y-3">
          {refs.map((ref) => (
            <div key={ref.path} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-sm font-bold text-gray-100">{ref.label}</div>
              <div className="mt-1 break-all rounded-lg bg-black/30 px-2 py-1.5 font-mono text-xs text-blue-300">{ref.path}</div>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{ref.note}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function FormulaBlock({ title, formula, rows }: { title: string; formula: string; rows: Array<[string, string]> }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center text-base font-bold text-gray-100">
          <HelpCircle className="mr-2 h-4 w-4 text-blue-400" />
          {title}
        </h3>
        <div className="mt-3 rounded-xl border border-white/10 bg-[#121214] p-4 text-center font-mono text-sm font-bold text-blue-300">{formula}</div>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-white/5">
            {rows.map(([label, value]) => (
              <tr key={label} className="hover:bg-white/[0.02]">
                <td className="w-[220px] p-3 font-bold text-gray-200">{label}</td>
                <td className="p-3 leading-relaxed text-gray-400">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExplainCard({ tone, title, children }: { tone: "emerald" | "sky" | "violet"; title: string; children: ReactNode }) {
  const toneClass = {
    emerald: "border-emerald-500/15 bg-emerald-500/10 text-emerald-200",
    sky: "border-sky-500/15 bg-sky-500/10 text-sky-200",
    violet: "border-violet-500/15 bg-violet-500/10 text-violet-200",
  }[tone];

  return (
    <div className={`flex items-start rounded-xl border p-4 text-sm ${toneClass}`}>
      <Info className="mr-3 mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <div className="font-bold">{title}</div>
        <div className="mt-1 leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}

function NumberCard({
  icon,
  title,
  desc,
  value,
  onChange,
  min,
  max,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 shadow-lg">
      <div className="mb-6 flex items-start">
        <div className="mr-4 rounded-xl border border-white/10 bg-white/5 p-3">{icon}</div>
        <div>
          <h3 className="text-lg font-bold text-gray-200">{title}</h3>
          <p className="mt-1 text-sm text-gray-400">{desc}</p>
        </div>
      </div>
      <div className="relative">
        <input
          type="number"
          title={title}
          aria-label={title}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-4 pr-16 text-3xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-500"
          min={min}
          max={max}
        />
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">mm</span>
      </div>
      <div className="mt-3 flex items-center text-xs text-gray-500">
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
        Lưu vào bảng quy tắc qua API /api/admin/rules
      </div>
    </div>
  );
}
