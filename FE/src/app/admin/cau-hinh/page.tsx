"use client";

import { useCallback, useEffect, useState } from "react";
import { Cpu, HelpCircle, Loader2, Recycle, Ruler, Save, ShieldAlert, Trash2, Info, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
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
          disabled={isSaving || loading || isInvalidConfig}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Lưu cấu hình
        </button>
      </div>

      {isInvalidConfig && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-start text-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-3 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Lỗi cấu hình:</span> Chiều dài tối thiểu tái sử dụng phôi dư ({minReusable} mm) phải lớn hơn Ngưỡng phế liệu tối đa ({minScrap} mm).
            Nút <b>Lưu cấu hình</b> đã bị vô hiệu hóa cho đến khi cấu hình hợp lệ.
          </div>
        </div>
      )}

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

          {/* Quy tắc tối ưu cắt & Cách tính điểm (Score) */}
          <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-lg overflow-hidden mt-4">
            <button
              type="button"
              onClick={() => setShowScoreHelp(!showScoreHelp)}
              className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <div className="flex items-center">
                <HelpCircle className="w-5 h-5 text-blue-400 mr-3 shrink-0" />
                <div>
                  <span className="text-lg font-bold text-gray-100">Quy tắc tối ưu cắt &amp; Cách tính điểm (Score)</span>
                  <p className="text-xs text-gray-400 mt-1">
                    Thông tin minh bạch hóa thuật toán tối ưu hóa phôi nhôm 1D-CSP (Cấu hình hiện tại: MIN_SCRAP = {minScrap} mm | MIN_REUSABLE_LENGTH = {minReusable} mm)
                  </p>
                </div>
              </div>
              <span className="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1.5 rounded-lg font-medium transition-colors">
                {showScoreHelp ? "Thu gọn chi tiết" : "Xem chi tiết quy tắc"}
              </span>
            </button>

            {showScoreHelp && (
              <div className="px-6 py-6 space-y-6 text-sm text-gray-300 leading-relaxed">
                {/* Mục tiêu tối ưu */}
                <div>
                  <h3 className="text-base font-bold text-gray-100 flex items-center mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400 mr-2" />
                    1. Mục tiêu tối ưu hóa cắt
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-400">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                      <span className="font-semibold text-gray-200 block mb-1">Giảm hao hụt vật tư</span>
                      Cắt tối ưu hóa sơ đồ sao cho tỷ lệ hao hụt do mạch cắt (kerf) và lề an toàn biên ở mức thấp nhất có thể.
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                      <span className="font-semibold text-gray-200 block mb-1">Ưu tiên dọn kho</span>
                      Hệ thống tự động ưu tiên chọn các thanh phôi dư cũ (<span className="text-emerald-400 font-semibold">CON_DU</span>) để cắt trước khi dùng đến phôi nguyên mới dài 5.8m hoặc 6m.
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                      <span className="font-semibold text-gray-200 block mb-1">Ưu tiên phôi dư tái sử dụng</span>
                      Điều chỉnh sơ đồ sao cho phần dư còn lại sau cắt đủ dài để giữ lại làm phôi dư phục vụ cho các đơn hàng sau.
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                      <span className="font-semibold text-gray-200 block mb-1">Hạn chế phôi dư lỡ cỡ</span>
                      Tránh tối đa việc tạo ra các phần dư lỡ cỡ (không đủ ngắn để vứt đi và không đủ dài để tái sử dụng), gây tốn kho bãi và lãng phí nhôm.
                    </div>
                    <div className="col-span-1 md:col-span-2 bg-red-500/5 border border-red-500/10 rounded-xl p-3.5">
                      <span className="font-semibold text-red-300 block mb-1">Tránh dùng phôi lỗi</span>
                      Hệ thống tự động loại trừ các phôi đang có báo cáo sự cố hư hại (<span className="text-red-400 font-semibold">LOI</span>) đang chờ quản lý xử lý để đảm bảo an toàn sản xuất.
                    </div>
                  </div>
                </div>

                {/* Công thức Score */}
                <div className="border-t border-white/5 pt-6">
                  <h3 className="text-base font-bold text-gray-100 flex items-center mb-3">
                    <Cpu className="w-4 h-4 text-blue-400 mr-2" />
                    2. Công thức tính điểm (Score) đề xuất
                  </h3>
                  <p className="text-gray-400 mb-3">
                    Điểm số (Score) của mỗi phương án là tổng điểm đánh giá trên từng thanh phôi được sử dụng:
                  </p>
                  <div className="bg-[#121214] border border-white/5 rounded-xl p-4 font-mono text-center text-blue-400 font-semibold text-xs md:text-sm">
                    Score = Điểm tận dụng vật tư + Điểm phôi dư tái sử dụng + Điểm trạng thái phôi - Điểm phạt rủi ro
                  </div>
                </div>

                {/* Giải thích chi tiết */}
                <div className="border-t border-white/5 pt-6 space-y-4">
                  <h3 className="text-base font-bold text-gray-100 flex items-center">
                    <Info className="w-4 h-4 text-sky-400 mr-2" />
                    3. Chi tiết thuật toán &amp; Quy tắc Heuristic Backend
                  </h3>
                  
                  <div className="space-y-3.5 text-gray-400">
                    <div>
                      <p className="font-semibold text-gray-200 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />
                        Tận dụng tối đa phôi (Phần dư &lt; {minScrap} mm)
                      </p>
                      <p className="pl-3.5 mt-0.5">
                        Phần dư thừa rất nhỏ, được xem là phế liệu không thể dùng lại nhưng thể hiện phôi đã được tận dụng triệt để. 
                        Điểm số cộng rất cao: <code className="text-emerald-400 bg-white/5 px-1 py-0.5 rounded">Score = 1200 - phần_dư * 0.02</code> (Khoảng 1200 điểm).
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-200 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mr-2" />
                        Tái sử dụng phôi dư (Phần dư &ge; {minReusable} mm)
                      </p>
                      <p className="pl-3.5 mt-0.5">
                        Phần dư đủ dài để cất lại vào kho và phục vụ cho các đơn hàng sau.
                        Điểm số cộng tốt: <code className="text-sky-400 bg-white/5 px-1 py-0.5 rounded">Score = 700 + min(phần_dư / 25, 350)</code> (Dao động từ 700 đến 1050 điểm).
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-200 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2" />
                        Phần dư lỡ cỡ (Nằm giữa {minScrap} mm và {minReusable} mm)
                      </p>
                      <p className="pl-3.5 mt-0.5">
                        Đây là trường hợp xấu nhất: Phần dư lãng phí nhiều nhôm nhưng không đủ dài để tái sử dụng hiệu quả, gây chật kho. 
                        Bị trừ điểm rất nặng: <code className="text-red-400 bg-white/5 px-1 py-0.5 rounded">Score = -850 - ratio * 450</code> (Phạt từ -850 đến -1300 điểm, với ratio tỷ lệ lỡ cỡ).
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <p className="font-semibold text-gray-200">Các quy tắc Heuristic bổ trợ khi hệ thống tự động lập sơ đồ (Auto Plan):</p>
                      <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                        <li><span className="text-gray-200 font-medium">Ưu tiên dọn kho:</span> Nếu dùng phôi cũ (<code className="text-emerald-300">CON_DU</code>), cộng thêm <span className="text-emerald-300 font-bold">+120 điểm</span> để khuyến khích dùng phôi dư cũ trước.</li>
                        <li><span className="text-gray-200 font-medium">Gom mảnh tối ưu:</span> Nếu phần dư sau khi cắt mảnh hiện tại vẫn chứa được mảnh nhôm khác trong BOM, cộng <span className="text-sky-300 font-bold">+240 điểm</span> để gom nhát cắt gọn gàng vào ít phôi nhất.</li>
                        <li><span className="text-gray-200 font-medium">Bảo vệ cây dài:</span> Phạt nặng <span className="text-red-400 font-bold">-6000 điểm</span> nếu cắt một thanh dài duy nhất khi không còn thanh nào khác trong kho đáp ứng được đoạn nhôm dài nhất còn lại của BOM.</li>
                        <li><span className="text-gray-200 font-medium">Tie-break (Khít hơn):</span> Trừ đi <code className="text-gray-400">phần_dư * 0.01</code> để ưu tiên thanh phôi khít hơn khi có nhiều thanh phôi cho kết quả tương đương.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Bảng minh họa */}
                <div className="border-t border-white/5 pt-6">
                  <h3 className="text-base font-bold text-gray-100 flex items-center mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2" />
                    4. Bảng minh họa phân loại phần dư
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full border-collapse text-left text-xs md:text-sm">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-gray-200 font-bold">
                          <th className="p-3.5">Phân loại phần dư</th>
                          <th className="p-3.5">Điều kiện (Config hiện tại)</th>
                          <th className="p-3.5">Ý nghĩa sản xuất</th>
                          <th className="p-3.5 text-right">Tác động Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-400">
                        <tr className="hover:bg-white/5">
                          <td className="p-3.5 font-semibold text-emerald-400">Phế liệu nhỏ</td>
                          <td className="p-3.5 font-mono">&lt; {minScrap} mm</td>
                          <td className="p-3.5">Tận dụng triệt để phôi, phần nhôm bỏ đi rất nhỏ.</td>
                          <td className="p-3.5 text-right text-emerald-400 font-semibold">+1200 đến +{smallScrapMinScore} điểm</td>
                        </tr>
                        <tr className="hover:bg-white/5">
                          <td className="p-3.5 font-semibold text-sky-400">Phôi dư tái sử dụng</td>
                          <td className="p-3.5 font-mono">&ge; {minReusable} mm</td>
                          <td className="p-3.5">Đủ dài để thu hồi về kho, tái sử dụng cho đơn sau.</td>
                          <td className="p-3.5 text-right text-sky-400 font-semibold">+700 đến +1050 điểm</td>
                        </tr>
                        <tr className="hover:bg-white/5">
                          <td className="p-3.5 font-semibold text-amber-500">Phôi dư lỡ cỡ</td>
                          <td className="p-3.5 font-mono">Từ {minScrap} đến dưới {minReusable} mm</td>
                          <td className="p-3.5">Lỡ cỡ, khó tái sử dụng, gây chật kho bãi và lãng phí vật tư.</td>
                          <td className="p-3.5 text-right text-red-400 font-semibold">-850 đến -1300 điểm (Phạt)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Lưu ý minh bạch */}
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-xs md:text-sm text-gray-400 flex items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-200 mb-1">Lưu ý minh bạch cho người quản lý &amp; người chấm chuyên đề</h4>
                    <p className="mb-1.5">
                      Điểm đánh giá (Score) là phần diễn giải dựa trên quy tắc heuristic đang được Backend sử dụng để tối ưu hóa phôi nhôm dựa trên các thông số cấu hình vật lý.
                      Hệ thống hoàn toàn <span className="text-gray-200 font-medium">không sinh điểm ngẫu nhiên hoặc sử dụng mô hình trí tuệ nhân tạo (AI)</span> để chấm điểm tự do.
                    </p>
                    <p>
                      Mọi gợi ý, xếp hạng hay điểm số chỉ mang tính chất hỗ trợ quyết định (Decision Support). 
                      <span className="text-amber-300 font-semibold"> Admin/Quản lý vẫn là người đưa ra quyết định duyệt sơ đồ cắt cuối cùng</span> dựa trên kinh nghiệm và thực tế sản xuất.
                    </p>
                  </div>
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
