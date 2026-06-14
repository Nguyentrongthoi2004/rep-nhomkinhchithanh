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
  Lock,
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

type TabId = "setup" | "labor" | "materials" | "score" | "payments" | "example";

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
  { id: "example", label: "Ví dụ thực tiễn", icon: <HelpCircle className="h-4 w-4" /> },
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
          {activeTab === "example" && <ExampleTab />}
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
    <div className="space-y-6">
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

      <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6 space-y-5">
        <FormulaBlock
          title="Mô hình toán học 1D-CSP (Cutting Stock Problem)"
          formula={`L_khả_dụng = L_phôi - 2 x Lề_an_toàn | Hao_hụt_lưỡi_cưa = Số_nhát_cắt x ${kerf} mm`}
          rows={[
            ["Ràng buộc vật lý", `Tổng (chiều dài đoạn cắt + Kerf) <= Chiều dài hiện tại của phôi - 2 x Lề an toàn (${safeMargin} mm)`],
            ["Bảo toàn chiều dài phôi", `Chiều dài còn lại = Chiều dài trước cắt - Tổng chiều dài các đoạn cắt - (Số nhát cắt x ${kerf} mm)`],
            ["Định danh sau gia công", `Nếu Chiều dài còn lại >= ${minReusable} mm: Thu hồi làm phôi dư (CON_DU)`],
            ["Thải bỏ phế liệu", `Nếu Chiều dài còn lại < ${minScrap} mm: Đánh dấu hủy và thải bỏ (BO_DI)`],
            ["Mảnh dư lỡ cỡ", `Nếu từ ${minScrap} đến dưới ${minReusable} mm: Lưu trữ tạm thời (thuật toán phạt điểm nặng khi dùng)`],
          ]}
        />
        <ExplainCard tone="sky" title="Ý nghĩa thực tế của tham số">
          Các thông số vật lý này giúp thuật toán tối ưu hóa cắt phôi (1D-CSP) trên Backend kiểm soát hao hụt chính xác đến từng milimét, mô phỏng đúng điều kiện hoạt động của máy cưa tại xưởng để tránh kẹt cưa hoặc gãy phôi.
        </ExplainCard>
      </div>
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
        title="Công thức bóc tách chi phí nhân công"
        formula="Nhân công = Gia công xưởng + Xử lý kính/tấm + Lắp đặt + Khảo sát/di chuyển"
        rows={[
          ["Gia công xưởng tại xưởng", "Tiền công = Tổng mét dài nhôm thanh x 32.000 đ/m (Mỗi thanh nhôm cắt được tính theo độ dài thực tế / 1000)"],
          ["Xử lý kính / tấm panel", "Tiền công = Tổng diện tích tấm (W x H) x 25.000 đ/m² (Hỗ trợ bóc tách diện tích kính từ danh mục)"],
          ["Lắp đặt công trình", "Tiền công = max(Diện tích công trình, Tổng diện tích kính) x 120.000 đ/m²"],
          ["Khảo sát / Di chuyển", "Cố định 150.000 đ nếu đơn hàng có hạng mục sản xuất (mét dài nhôm hoặc diện tích kính lớn hơn 0)"],
          ["Cách tổng hợp Báo giá", "Tổng tiền đơn hàng = (Tổng tiền vật tư gốc + Tổng tiền nhân công) x (1 + % Lợi nhuận định biên)"],
        ]}
      />
      <ExplainCard tone="emerald" title="Ý nghĩa khi vấn đáp">
        Phần nhân công không còn là một số m² chung chung. Hệ thống tách theo công đoạn thực tế của xưởng: cắt/gia công nhôm, xử lý kính hoặc tấm, lắp đặt tại công trình và chi phí khảo sát/di chuyển, giúp tối ưu hóa giá thành và quản lý lương thợ hiệu quả.
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
        title="Định mức và Công thức tính toán vật tư (BOM Pricing)"
        formula="Thành tiền cấu kiện = Đơn giá dòng (Đã đóng băng) x Số lượng"
        rows={[
          ["Đơn giá gốc", "Hệ thống tự động tra cứu từ master-data vật tư: Ưu tiên đơn giá bán (dongiaban), nếu trống sẽ dùng đơn giá nhập (dongianhap)."],
          ["Nhôm thanh định mức", "Đơn giá = round( (Đơn giá thanh gốc x Chiều dài cắt) / Chiều dài mặc định thanh ). Ví dụ: Thanh 6000mm giá 300k, cắt đoạn 1800mm -> Giá = 90k."],
          ["Kính cường lực / Tấm", "Đơn giá = round( (Đơn giá/m² x Chiều rộng x Chiều cao) / 1.000.000 ). Đổi kích thước mm² sang m² để tính tiền tỉ lệ thuận."],
          ["Phụ kiện & vật tư phụ", "Đơn giá = Đơn giá gốc (tính cố định theo món, bộ hoặc chiếc)."],
          ["Price Freeze (Đóng băng giá)", "Khi đơn hàng chuyển sang trạng thái Đã cọc (DA_COC), toàn bộ đơn giá tại thời điểm đó sẽ được sao chép và chốt cứng vào cột chitietdh.dongiadongbang. Mọi biến động giá vật tư sau này trên thị trường sẽ không làm thay đổi giá trị hợp đồng của khách hàng."],
        ]}
      />
      <ExplainCard tone="sky" title="Bảo mật và toàn vẹn dữ liệu đơn giá">
        Backend (Express API) luôn kiểm tra và tính toán lại đơn giá vật tư dựa trên master-data khi khởi tạo/sửa BOM nhằm chống gian lận dữ liệu từ phía Client. Khi đơn hàng đã đóng băng, hệ thống chốt chặt chi phí để bảo toàn công nợ.
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
          ["Phôi dư lỡ cỡ", `Từ ${context.minScrap} đến dưới ${context.minReusable} mm: -850 - ratio x 450 (với ratio = (phần_dư - ${context.minScrap}) / (${context.minReusable} - ${context.minScrap}))`],
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
      <ExplainCard tone="sky" title="Ràng buộc vật lý bài toán cắt một chiều (1D-CSP)">
        Tổng chiều dài các đoạn cắt + (Số nhát cắt x {context.kerf} mm) + (2 x {context.safeMargin} mm biên kẹp đầu cưa) phải nhỏ hơn hoặc bằng Chiều dài gốc của thanh phôi vật lý. Thuật toán sẽ báo lỗi thiếu phôi nếu có bất kỳ chi tiết đơn lẻ nào vượt quá chiều dài khả dụng tối đa này.
      </ExplainCard>
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
        title="Quản lý Tài chính, Công nợ và Quy trình vận hành"
        formula="Công nợ còn lại = Tổng giá trị đơn hàng - Tổng lũy kế tiền đã cọc/thanh toán"
        rows={[
          ["Báo giá nháp", "Đơn hàng khởi tạo ở trạng thái BAO_GIA_NHAP. Cho phép chỉnh sửa BOM vật tư và nhân công tự do."],
          ["Gửi báo giá", "Hệ thống gửi email báo giá cho khách và lưu thời gian baogia_gui_luc. Sau bước này, nút Duyệt đơn giá mới được kích hoạt."],
          ["Đặt cọc (DA_COC)", "Nhập giao dịch DAT_COC. Kích hoạt cơ chế Price Freeze (Đóng băng giá BOM) để chốt công nợ ổn định."],
          ["Khóa nghiệp vụ chống thanh toán vượt", "Hệ thống chặn không cho phép nhập số tiền thanh toán vượt quá số tiền công nợ còn lại của khách hàng."],
          ["Tất toán đơn hàng", "Khi khách thanh toán nốt phần tiền còn lại (nhập giao dịch HOAN_TAT), tổng tiền đã trả đạt 100% giá trị đơn hàng, công nợ về 0 đ và chuyển trạng thái sang HOAN_THANH."],
          ["Công thức Hủy đơn (HUY_DON)", "Tiền hoàn lại = Tiền cọc - Phí phạt hủy đơn (10% tổng trị giá đơn hàng) - Tổng giá trị hao phí vật tư thực tế đã cắt. Giúp bảo toàn dòng tiền và bù đắp hao tổn vật liệu cho cửa hàng."],
          ["Quy tắc thu hồi dở dang khi hủy đơn", "Các cấu kiện đang gia công dở dang được phân loại: Chiều dài >= 1500mm được thu hồi làm phôi dư (CON_DU) -> Không tính vào hao phí đền bù của khách. Chiều dài < 1500mm bị hủy bỏ làm phế liệu (BO_DI) -> Tính hoàn toàn vào hao phí khách chịu."],
          ["Thời điểm khấu trừ kho phôi vật lý", "Hệ thống tuyệt đối không trừ kho khi khởi tạo hay đề xuất sơ đồ cắt. Kho phôi chỉ thực tế bị trừ đi khi thợ bấm xác nhận hoàn thành nhát cắt (completePlan) hoặc khi quản trị viên duyệt cắt bỏ đoạn lỗi phôi (Trim phôi)."],
        ]}
      />
      <ExplainCard tone="violet" title="Tích hợp đề xuất trong tương lai (VietQR)">
        Có thể thêm VietQR ở bước báo giá hoặc đặt cọc/thanh toán. Hệ thống sẽ tự động sinh mã QR chuyển khoản động chứa số tài khoản xưởng, số tiền tương ứng với đợt thanh toán và cú pháp chuyển khoản định dạng DH-[mã đơn] để thuận tiện đối soát.
      </ExplainCard>
    </RuleTabShell>
  );
}

function ExampleTab() {
  return (
    <div className="space-y-8">
      {/* Title block */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-transparent p-6 shadow-xl">
        <h2 className="flex items-center text-xl font-bold text-gray-100 mb-2">
          <HelpCircle className="mr-3 h-6 w-6 text-indigo-400" />
          Kịch bản thực tiễn: Vòng đời đơn hàng DH-707
        </h2>
        <p className="text-gray-400 text-sm">
          Luồng trực quan hóa toàn bộ quá trình tính toán định mức, bóc tách giá vật tư, nhân công, đặt cọc đóng băng giá, tối ưu cắt phôi 1D-CSP và tất toán dòng tiền.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 space-y-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">1</span>
                <h3 className="text-lg font-bold text-gray-100">Bóc tách định mức BOM & Tính báo giá</h3>
              </div>
              <span className="rounded-lg bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-400">Đơn hàng nháp</span>
            </div>

            <div className="space-y-4">
              {/* BOM Spec */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center">
                  <Package className="mr-2 h-4 w-4" /> Định mức vật tư yêu cầu (BOM)
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-black/30 p-2.5">
                    <span className="text-gray-300">Nhôm Xingfa hệ 55 (Dùng cây 6000mm)</span>
                    <span className="font-mono text-cyan-400 font-bold">4 đoạn x 1800mm | 2 đoạn x 1200mm</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-black/30 p-2.5">
                    <span className="text-gray-300">Kính cường lực 8mm</span>
                    <span className="font-mono text-blue-400 font-bold">2 tấm x 900 x 1800 mm (1.62 m²/tấm)</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-black/30 p-2.5">
                    <span className="text-gray-300">Phụ kiện cửa nhôm Xingfa</span>
                    <span className="font-mono text-amber-400 font-bold">4 bộ khóa/bản lề</span>
                  </div>
                </div>
              </div>

              {/* Pricing Calculation */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center">
                  <Calculator className="mr-2 h-4 w-4" /> Chi tiết tính giá gốc & nhân công
                </h4>
                <div className="divide-y divide-white/5 text-[11px] text-gray-400 space-y-3 font-mono">
                  <div className="pb-3 space-y-2 leading-relaxed">
                    <div className="text-gray-200 font-semibold font-sans">1. Giá vật tư gốc:</div>
                    <div>
                      • Nhôm Xingfa (Giá 300k/thanh nguyên 6000mm):<br />
                      &nbsp;&nbsp;&nbsp;+ 1 đoạn 1.8m = (300k * 1800) / 6000 = 90k<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&gt; Có 4 đoạn: 90k * 4 = 360k<br />
                      &nbsp;&nbsp;&nbsp;+ 1 đoạn 1.2m = (300k * 1200) / 6000 = 60k<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&gt; Có 2 đoạn: 60k * 2 = 120k
                    </div>
                    <div>
                      • Kính cường lực 8mm (Giá 400k/m²):<br />
                      &nbsp;&nbsp;&nbsp;+ Diện tích 1 tấm = 0.9m * 1.8m = 1.62m²<br />
                      &nbsp;&nbsp;&nbsp;+ Giá 1 tấm kính = 400k * 1.62 = 648k<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&gt; Có 2 tấm kính: 648k * 2 = 1.296k
                    </div>
                    <div>• Phụ kiện: 4 bộ x 50k = 200k</div>
                    <div className="text-indigo-400 font-semibold font-sans mt-1">Tổng tiền vật tư = 360k + 120k + 1.296k + 200k = 1.976.000 đ</div>
                  </div>
                  <div className="pt-3 space-y-2 leading-relaxed">
                    <div className="text-gray-200 font-semibold font-sans">2. Tiền nhân công bóc tách:</div>
                    <div>
                      • Công gia công nhôm (32k/m dài):<br />
                      &nbsp;&nbsp;&nbsp;+ Tổng chiều dài nhôm = (4 đoạn * 1.8m) + (2 đoạn * 1.2m) = 7.2m + 2.4m = 9.6m nhôm<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&gt; Tiền công = 9.6m * 32.000 đ/m = 307.200 đ
                    </div>
                    <div>
                      • Công xử lý kính (25k/m² diện tích):<br />
                      &nbsp;&nbsp;&nbsp;+ Tổng diện tích kính = 2 tấm * 1.62m² = 3.24m² kính<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&gt; Tiền công = 3.24m² * 25.000 đ/m² = 81.000 đ
                    </div>
                    <div>
                      • Công lắp đặt công trình (120k/m²):<br />
                      &nbsp;&nbsp;&nbsp;+ Tiền công = max(Diện tích công trình, Diện tích kính 3.24m²) * 120.000 đ/m² = 3.24 * 120k = 388.800 đ
                    </div>
                    <div>• Khảo sát di chuyển: Cố định 150.000 đ (Đơn có nhôm/kính)</div>
                    <div className="text-emerald-400 font-semibold font-sans mt-1">Tổng tiền nhân công = 307.200 + 81.000 + 388.800 + 150.000 = 927.000 đ</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Price Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 gap-4">
              <div className="text-xs text-indigo-300 leading-relaxed max-w-[280px]">
                <strong>Tổng báo giá</strong> = (Tổng vật tư + Tổng nhân công) x (1 + 20% lợi nhuận định biên)
              </div>
              <div className="text-2xl font-black font-mono text-indigo-400">
                3.483.600 đ
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">2</span>
                <h3 className="text-lg font-bold text-gray-100">Đặt cọc & Đóng băng đơn giá</h3>
              </div>
              <span className="rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">Đã đặt cọc</span>
            </div>
            
            <p className="text-sm text-gray-400">
              Khách hàng đặt cọc <strong>30% giá trị đơn hàng</strong> (tương đương <strong>1.045.000 đ</strong>).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <div className="text-[10px] uppercase text-gray-500">Tiền cọc thực nhận</div>
                <div className="text-base font-bold text-gray-200 font-mono mt-1">1.045.000 đ</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <div className="text-[10px] uppercase text-gray-500">Công nợ còn lại</div>
                <div className="text-base font-bold text-indigo-400 font-mono mt-1">2.438.600 đ</div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4 flex gap-3">
              <Lock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-300 leading-relaxed">
                <strong>Price Freeze kích hoạt:</strong> Hệ thống lưu cố định đơn giá vật tư vào <code>chitietdh.dongiadongbang</code>. Đơn hàng được bảo vệ trước mọi biến động giá nhôm/kính của nhà cung cấp.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 3 */}
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 space-y-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">3</span>
                <h3 className="text-lg font-bold text-gray-100">Tối ưu hóa sơ đồ cắt (1D-CSP)</h3>
              </div>
              <span className="rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">Sơ đồ tối ưu</span>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Nhu cầu cắt: <strong>4 thanh 1800mm</strong> và <strong>2 thanh 1200mm</strong>. Quy định: mạch cưa (kerf) = 5mm, lề an toàn cưa = 20mm ở mỗi đầu.
              </p>

              <div className="space-y-4 rounded-xl bg-black/40 p-4 border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Sơ đồ xếp nhát cắt trực quan từ thuật toán Bar Scoring:</h4>
                
                {/* Bar 1 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-gray-400 font-mono">
                    <span>Thanh #1: Phôi dư 2400mm (Khả dụng = 2360mm)</span>
                    <span className="text-red-400">Score = -895 (Lỡ cỡ)</span>
                  </div>
                  <div className="h-8 w-full rounded-lg bg-gray-800 overflow-hidden flex font-bold font-mono text-[10px] text-center border border-white/10">
                    <div className="w-[75%] bg-indigo-600/90 text-white flex items-center justify-center border-r border-red-500/30">CẮT 1800mm</div>
                    <div className="w-[1%] bg-red-600 flex items-center justify-center" title="Kerf 5mm">K</div>
                    <div className="w-[24%] bg-amber-600/30 text-amber-300 flex items-center justify-center text-[9px]">LỠ CỠ 595mm (Hủy)</div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono pl-2">
                    Cách tính: Score = Điểm lỡ cỡ (-1009.1) + Dọn kho phôi cũ (+120) - Tie-break (595 x 0.01) = -895.05 (Làm tròn: -895)
                  </div>
                </div>

                {/* Bar 2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-gray-400 font-mono">
                    <span>Thanh #2: Phôi dư 1800mm (Khả dụng = 1760mm)</span>
                    <span className="text-red-400">Score = -895 (Lỡ cỡ)</span>
                  </div>
                  <div className="h-8 w-full rounded-lg bg-gray-800 overflow-hidden flex font-bold font-mono text-[10px] text-center border border-white/10">
                    <div className="w-[66.7%] bg-indigo-600/90 text-white flex items-center justify-center border-r border-red-500/30">CẮT 1200mm</div>
                    <div className="w-[1%] bg-red-600 flex items-center justify-center" title="Kerf 5mm">K</div>
                    <div className="w-[32.3%] bg-amber-600/30 text-amber-300 flex items-center justify-center text-[9px]">LỠ CỠ 595mm (Hủy)</div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono pl-2">
                    Cách tính: Score = Điểm lỡ cỡ (-1009.1) + Dọn kho phôi cũ (+120) - Tie-break (595 x 0.01) = -895.05 (Làm tròn: -895)
                  </div>
                </div>

                {/* Bar 3 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-gray-400 font-mono">
                    <span>Thanh #3: Phôi mới 6000mm (Khả dụng = 5960mm)</span>
                    <span className="text-red-400">Score = -1211 (Lỡ cỡ)</span>
                  </div>
                  <div className="h-8 w-full rounded-lg bg-gray-800 overflow-hidden flex font-bold font-mono text-[10px] text-center border border-white/10">
                    <div className="w-[30%] bg-indigo-600/90 text-white flex items-center justify-center border-r border-red-500/30">CẮT 1800</div>
                    <div className="w-[1%] bg-red-600 flex items-center justify-center" title="Kerf 5mm">K</div>
                    <div className="w-[30%] bg-indigo-600/90 text-white flex items-center justify-center border-r border-red-500/30">CẮT 1800</div>
                    <div className="w-[1%] bg-red-600 flex items-center justify-center" title="Kerf 5mm">K</div>
                    <div className="w-[20%] bg-indigo-600/90 text-white flex items-center justify-center border-r border-red-500/30">CẮT 1200</div>
                    <div className="w-[1%] bg-red-600 flex items-center justify-center" title="Kerf 5mm">K</div>
                    <div className="w-[17%] bg-amber-600/30 text-amber-300 flex items-center justify-center text-[9px]">LỠ CỠ 1185mm (Hủy)</div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono pl-2">
                    Cách tính (nhát cuối 1200): Score = Điểm lỡ cỡ (-1198.75) + Phôi mới (0) - Tie-break (1185 x 0.01) = -1210.6 (Làm tròn: -1211)
                  </div>
                </div>

                {/* Bar 4 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-gray-400 font-mono">
                    <span>Thanh #4: Phôi mới 6000mm (Khả dụng = 5960mm)</span>
                    <span className="text-emerald-400 font-bold">Score = +826 (Tái sử dụng)</span>
                  </div>
                  <div className="h-8 w-full rounded-lg bg-gray-800 overflow-hidden flex font-bold font-mono text-[10px] text-center border border-white/10">
                    <div className="w-[30%] bg-indigo-600/90 text-white flex items-center justify-center border-r border-red-500/30">CẮT 1800mm</div>
                    <div className="w-[1%] bg-red-600 flex items-center justify-center" title="Kerf 5mm">K</div>
                    <div className="w-[69%] bg-emerald-600/20 text-emerald-300 flex items-center justify-center">THU HỒI DƯ 4195mm (CON_DU)</div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono pl-2">
                    Cách tính: Score = Điểm tái sử dụng (+867.8) + Phôi mới (0) - Tie-break (4195 x 0.01) = +825.85 (Làm tròn: +826)
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-4 flex gap-3">
                <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs text-sky-300 leading-relaxed">
                  <strong>Thu hồi thông minh:</strong> Thuật toán dọn sạch 2 thanh phôi dư cũ trong kho, bảo toàn các thanh nhôm dài và tự động tính toán thu hồi phần dư có giá trị (4195mm) để đưa ngược vào kho.
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">4</span>
                <h3 className="text-lg font-bold text-gray-100">Xác nhận gia công & Cập nhật kho</h3>
              </div>
              <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">Đã trừ kho</span>
            </div>

            <p className="text-sm text-gray-400">
              Thợ xác nhận hoàn thành (hàm <code>completePlan</code> chạy giao dịch database):
            </p>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-gray-300 font-bold">
                  <tr>
                    <th className="p-3">Thanh phôi</th>
                    <th className="p-3">Trước cắt</th>
                    <th className="p-3">Cắt + Kerf</th>
                    <th className="p-3">Chiều dài sau</th>
                    <th className="p-3 text-right">Trạng thái kho mới</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-400 font-mono">
                  <tr>
                    <td className="p-3 text-gray-200 font-bold">Thanh #1 (Phôi dư)</td>
                    <td className="p-3">2400 mm</td>
                    <td className="p-3">1800mm + 5mm</td>
                    <td className="p-3">595 mm</td>
                    <td className="p-3 text-right"><span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 font-bold font-sans">BO_DI (Hủy)</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-200 font-bold">Thanh #2 (Phôi dư)</td>
                    <td className="p-3">1800 mm</td>
                    <td className="p-3">1200mm + 5mm</td>
                    <td className="p-3">595 mm</td>
                    <td className="p-3 text-right"><span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 font-bold font-sans">BO_DI (Hủy)</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-200 font-bold">Thanh #3 (Phôi mới)</td>
                    <td className="p-3">6000 mm</td>
                    <td className="p-3">4800mm + 15mm</td>
                    <td className="p-3">1185 mm</td>
                    <td className="p-3 text-right"><span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 font-bold font-sans">BO_DI (Hủy)</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-emerald-400 font-bold">Thanh #4 (Phôi mới)</td>
                    <td className="p-3 text-emerald-400">6000 mm</td>
                    <td className="p-3 text-emerald-400">1800mm + 5mm</td>
                    <td className="p-3 text-emerald-400">4195 mm</td>
                    <td className="p-3 text-right"><span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 font-bold font-sans">CON_DU (Thu hồi)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 5 */}
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">5</span>
                <h3 className="text-lg font-bold text-gray-100">Tất toán công nợ & Hoàn thành</h3>
              </div>
              <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">Hoàn thành đơn</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
                <h4 className="text-[10px] uppercase text-gray-500">Đối soát dòng tiền</h4>
                <div className="space-y-1 text-xs font-mono text-gray-400">
                  <div className="flex justify-between">
                    <span>Đã đặt cọc (30%):</span>
                    <span>1.045.000 đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tất toán (70%):</span>
                    <span>2.438.600 đ</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold text-emerald-400">
                    <span>Tổng thu:</span>
                    <span>3.483.600 đ</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Đã hoàn tất đối soát
                </div>
                <p className="text-[10px] text-emerald-300/80 leading-relaxed mt-2 font-sans">
                  Công nợ về <strong>0 đ</strong>. Đơn hàng chuyển sang trạng thái <strong>HOAN_THANH</strong>. Toàn bộ lịch sử các giao dịch, ảnh gia công, nhật ký gia công (mank) của phôi và nhật ký hệ thống được lưu vết vĩnh viễn phục vụ đối soát tài chính.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
