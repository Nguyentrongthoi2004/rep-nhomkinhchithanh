"use client";

import { useCallback, useEffect, useState } from "react";
import { Cpu, HelpCircle, Loader2, Recycle, Ruler, Save, ShieldAlert, Trash2 } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";

type Rule = {
  maqt: string;
  tenqt: string;
  giatri: number;
};

export default function ConfigPage() {
  const [kerf, setKerf] = useState(5);
  const [safeMargin, setSafeMargin] = useState(20);
  const [minScrap, setMinScrap] = useState(100);
  const [minReusable, setMinReusable] = useState(1500);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showScoreHelp, setShowScoreHelp] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Cpu className="w-6 h-6 mr-3 text-blue-500" />
            Cấu hình thuật toán cắt
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">Các thông số này được lưu vào bảng quy tắc và dùng khi tạo sơ đồ cắt.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || loading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Lưu cấu hình
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <NumberCard
              icon={<Ruler className="w-6 h-6 text-blue-400" />}
              title="Độ hở lưỡi cưa"
              desc="Phần nhôm bị hao sau mỗi nhát cắt (kerf)."
              value={kerf}
              onChange={setKerf}
              min={0}
              max={20}
            />
            <NumberCard
              icon={<ShieldAlert className="w-6 h-6 text-red-400" />}
              title="Lề an toàn"
              desc="Phần chừa an toàn ở hai đầu thanh phôi để kẹp máy."
              value={safeMargin}
              onChange={setSafeMargin}
              min={0}
              max={100}
            />
            <NumberCard
              icon={<Trash2 className="w-6 h-6 text-amber-400" />}
              title="Ngưỡng phế liệu tối đa"
              desc="Phần dư nhỏ hơn ngưỡng này được xem là tận dụng gần hết phôi."
              value={minScrap}
              onChange={setMinScrap}
              min={0}
              max={500}
            />
            <NumberCard
              icon={<Recycle className="w-6 h-6 text-emerald-400" />}
              title="Chiều dài tối thiểu tái sử dụng"
              desc="Phần dư lớn hơn hoặc bằng ngưỡng này được giữ lại làm phôi dư."
              value={minReusable}
              onChange={setMinReusable}
              min={100}
              max={5000}
            />
          </div>

          {/* Score help section */}
          <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-lg overflow-hidden mt-2">
            <button
              type="button"
              onClick={() => setShowScoreHelp(!showScoreHelp)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center">
                <HelpCircle className="w-5 h-5 text-sky-400 mr-3 shrink-0" />
                <span className="text-base font-bold text-gray-200">Cách tính score &amp; tối ưu</span>
              </div>
              <span className="text-xs text-gray-500 font-semibold">{showScoreHelp ? "Thu gọn" : "Xem chi tiết"}</span>
            </button>

            {showScoreHelp && (
              <div className="px-6 pb-6 space-y-5 text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-4">
                <div>
                  <h4 className="font-bold text-gray-100 mb-2">1. Hệ thống ưu tiên tận dụng phôi hiệu quả</h4>
                  <ul className="list-disc pl-5 space-y-1 text-gray-400">
                    <li>Cắt sao cho phần dư sau cắt càng hợp lý càng tốt.</li>
                    <li>Tránh tạo phần dư lỡ cỡ: phần dư không đủ dài để tái sử dụng nhưng cũng không nhỏ để coi như tận dụng hết.</li>
                    <li>Ưu tiên dùng phôi dư cũ trước để dọn kho.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-gray-100 mb-2">2. Ý nghĩa cấu hình</h4>
                  <ul className="list-disc pl-5 space-y-1 text-gray-400">
                    <li><b className="text-gray-200">Độ hở lưỡi cưa ({kerf} mm):</b> số mm hao hụt sau mỗi nhát cắt.</li>
                    <li><b className="text-gray-200">Lề an toàn ({safeMargin} mm):</b> phần chiều dài chừa lại ở hai đầu phôi để kẹp/cắt an toàn.</li>
                    <li><b className="text-gray-200">Ngưỡng phế liệu tối đa ({minScrap} mm):</b> nếu phần dư nhỏ hơn ngưỡng này, hệ thống xem như tận dụng gần hết phôi → score cao.</li>
                    <li><b className="text-gray-200">Chiều dài tối thiểu tái sử dụng ({minReusable} mm):</b> nếu phần dư ≥ ngưỡng này, hệ thống giữ lại làm phôi dư cho lần sau → score tốt.</li>
                    <li>Nếu phần dư nằm giữa {minScrap} mm và {minReusable} mm → phần dư lỡ cỡ, bị trừ điểm nặng.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-gray-100 mb-2">3. Ý nghĩa score</h4>
                  <ul className="list-disc pl-5 space-y-1 text-gray-400">
                    <li><b className="text-emerald-300">Score cao dương:</b> phương án tốt, tận dụng phôi hiệu quả hoặc tạo phần dư còn tái sử dụng được.</li>
                    <li><b className="text-amber-300">Score thấp:</b> phương án kém tối ưu hơn.</li>
                    <li><b className="text-red-300">Score âm:</b> cảnh báo tạo phần dư lỡ cỡ — lãng phí nhôm.</li>
                    <li>Score chỉ là chỉ số hỗ trợ đánh giá. Admin vẫn cần xem chi tiết phôi, nhát cắt, phần dư và lý do đề xuất trước khi duyệt.</li>
                  </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="font-bold text-gray-100 mb-2">4. Ví dụ nhanh</h4>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                      Dư nhỏ hơn <b className="text-white">{minScrap} mm</b>: tận dụng gần hết phôi → <b className="text-emerald-300">score cao</b>.
                    </li>
                    <li>
                      <span className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-2" />
                      Dư ≥ <b className="text-white">{minReusable} mm</b>: có thể tái sử dụng làm phôi dư → <b className="text-sky-300">score tốt</b>.
                    </li>
                    <li>
                      <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2" />
                      Dư nằm giữa <b className="text-white">{minScrap}</b> và <b className="text-white">{minReusable} mm</b>: lỡ cỡ, khó tái sử dụng → <b className="text-red-300">score âm</b>.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </>
      )}
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
  icon: React.ReactNode;
  title: string;
  desc: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 shadow-lg">
      <div className="flex items-start mb-6">
        <div className="p-3 bg-white/5 rounded-xl mr-4 border border-white/10">{icon}</div>
        <div>
          <h3 className="text-lg font-bold text-gray-200">{title}</h3>
          <p className="text-sm text-gray-400 mt-1">{desc}</p>
        </div>
      </div>
      <div className="relative">
        <input
          type="number"
          title={title}
          aria-label={title}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="bg-white/5 border border-white/10 text-3xl font-bold text-white rounded-xl w-full p-4 pr-16 focus:ring-2 focus:ring-blue-500 outline-none"
          min={min}
          max={max}
        />
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">mm</span>
      </div>
    </div>
  );
}
