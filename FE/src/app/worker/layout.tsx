"use client";

import { Home, CalendarDays, ClipboardList, Settings, Scissors } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/worker", icon: Home, label: "Trang Chủ" },
    { href: "/worker/tasks", icon: ClipboardList, label: "Nhiệm Vụ" },
    { href: "/worker/simulator", icon: Scissors, label: "Mô Phỏng" },
    { href: "/worker/calendar", icon: CalendarDays, label: "Lịch" },
    { href: "/worker/ca-nhan", icon: Settings, label: "Cá Nhân" },
  ];

  return (
    <div className="min-h-dvh bg-black relative overflow-hidden font-sans">
      {/* Lớp nền trang trí */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[100px]" />
      </div>

      {/* Khung ứng dụng, co giãn tốt trên nhiều kích thước điện thoại */}
      <div className="relative z-10 min-h-dvh bg-[#0a0a0c] flex flex-col">
        {/* Vùng nội dung có thể cuộn */}
        <div className="flex-1 overflow-y-auto pb-[76px] no-scrollbar scroll-smooth">
          {children}
        </div>

        {/* Thanh điều hướng dưới */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#121217]/95 backdrop-blur-md border-t border-white/5 h-[68px] flex items-center justify-around px-2 z-50 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-16 h-full relative group">
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[3px] bg-blue-500 rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                )}
                <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 group-hover:text-gray-300'}`}>
                  <Icon className={`w-[22px] h-[22px] ${isActive && 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`} />
                </div>
                <span className={`text-[10px] font-medium mt-1 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
