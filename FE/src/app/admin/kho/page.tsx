"use client";

import Link from "next/link";
import { Box, Package, Layers, ArrowRight, Database } from "lucide-react";

export default function AdminKhoHubPage() {
  return (
    <div className="space-y-6">
      <div className="admin-metal-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="admin-metal-shine" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Box className="w-6 h-6 mr-3 text-slate-300" />
            Kho phôi & Vật tư
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">
            Quản lý vật tư master-data và kho phôi (UID) theo lô nhập.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link
          href="/admin/vat-tu"
          className="admin-metal-panel rounded-2xl p-6 relative overflow-hidden group hover:border-white/12 transition-colors"
        >
          <div className="admin-metal-shine" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-200">
                <Layers className="w-3.5 h-3.5" /> Master-data
              </div>
              <h2 className="text-lg font-bold text-white mt-3">Vật tư</h2>
              <p className="text-sm text-gray-400 mt-1">
                CRUD mã vật tư, danh mục, đơn giá, chiều dài mặc định…
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/8 transition-colors">
              <Database className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
          <div className="relative z-10 mt-5 flex items-center text-sm font-bold text-slate-200">
            Mở trang Vật tư <ArrowRight className="w-4 h-4 ml-2 text-emerald-300" />
          </div>
        </Link>

        <Link
          href="/admin/kho-phoi"
          className="admin-metal-panel rounded-2xl p-6 relative overflow-hidden group hover:border-white/12 transition-colors"
        >
          <div className="admin-metal-shine" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-200">
                <Package className="w-3.5 h-3.5" /> UID tracking
              </div>
              <h2 className="text-lg font-bold text-white mt-3">Kho phôi</h2>
              <p className="text-sm text-gray-400 mt-1">
                Nhập lô, quản lý UID, cập nhật chiều dài hiện tại, trạng thái phôi…
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/8 transition-colors">
              <Package className="w-6 h-6 text-cyan-300" />
            </div>
          </div>
          <div className="relative z-10 mt-5 flex items-center text-sm font-bold text-slate-200">
            Mở trang Kho phôi <ArrowRight className="w-4 h-4 ml-2 text-cyan-300" />
          </div>
        </Link>
      </div>
    </div>
  );
}

