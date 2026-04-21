"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Database, 
  ShoppingCart, 
  Box, 
  Scissors, 
  Users, 
  ShieldCheck,
  Settings,
  Hexagon
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { name: "Quản lý Đơn hàng", href: "/admin/don-hang", icon: ShoppingCart },
  { name: "Danh mục gốc", href: "/admin/danh-muc", icon: Database },
  { name: "Kho phôi & Vật tư", href: "/admin/kho", icon: Box },
  { name: "Bản vẽ & Sản xuất", href: "/admin/san-xuat", icon: Scissors },
  { name: "Nhân sự", href: "/admin/nhan-su", icon: Users },
  { name: "Yêu cầu cấp quyền", href: "/admin/yeu-cau-cap-quyen", icon: ShieldCheck },
  { name: "Cấu hình", href: "/admin/cau-hinh", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen admin-metal-panel border-r border-white/5 flex flex-col shrink-0 relative overflow-hidden">
      <div className="admin-metal-shine" />
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <div className="brand-mark">
          <div className="brand-icon flex items-center justify-center">
            <Hexagon className="w-5 h-5 text-slate-100 drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]" />
          </div>
          <div className="leading-tight">
            <div className="brand-name text-[15px]">Nhôm Kính Chí Thành</div>
            <div className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">ERP</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-blue-400" : "text-gray-500"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Area */}
      <div className="p-4 border-t border-white/5">
        <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
          <p className="text-xs text-gray-400">Hệ thống</p>
          <p className="text-sm text-green-400 font-medium flex items-center mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Đang hoạt động
          </p>
        </div>
      </div>
    </aside>
  );
}
