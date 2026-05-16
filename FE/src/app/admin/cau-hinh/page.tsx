"use client";

import { useCallback, useEffect, useState } from "react";
import { Cpu, Loader2, Ruler, Save, ShieldAlert } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";

type Rule = {
  maqt: string;
  tenqt: string;
  giatri: number;
};

export default function ConfigPage() {
  const [kerf, setKerf] = useState(4);
  const [safeMargin, setSafeMargin] = useState(20);
  const [minOffcut, setMinOffcut] = useState(200);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const rules = await apiData<Rule[]>("/api/admin/rules");
      setKerf(Number(rules.find((r) => r.maqt === "BLADE_KERF")?.giatri ?? 4));
      setSafeMargin(Number(rules.find((r) => r.maqt === "SAFE_MARGIN")?.giatri ?? 20));
      setMinOffcut(Number(rules.find((r) => r.maqt === "MIN_OFFCUT")?.giatri ?? 200));
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
        apiJson("/api/admin/rules/MIN_OFFCUT", {
          method: "PUT",
          body: JSON.stringify({ tenqt: "Độ dài phôi dư tối thiểu", giatri: minOffcut }),
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <NumberCard
            icon={<Ruler className="w-6 h-6 text-blue-400" />}
            title="Độ hở lưỡi cưa"
            desc="Phần nhôm bị hao sau mỗi nhát cắt."
            value={kerf}
            onChange={setKerf}
            min={0}
            max={20}
          />
          <NumberCard
            icon={<ShieldAlert className="w-6 h-6 text-red-400" />}
            title="Lề an toàn"
            desc="Phần chừa an toàn ở hai đầu thanh phôi."
            value={safeMargin}
            onChange={setSafeMargin}
            min={0}
            max={100}
          />
          <NumberCard
            icon={<Ruler className="w-6 h-6 text-amber-400" />}
            title="Phôi dư tối thiểu"
            desc="Độ dài tối thiểu để giữ lại và tái sử dụng phôi dư."
            value={minOffcut}
            onChange={setMinOffcut}
            min={0}
            max={1000}
          />
        </div>
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
