"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Scissors, User } from "lucide-react";

export default function WorkerBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Hôm nay", href: "/worker", icon: Home },
    { name: "Kho phôi", href: "/worker/kho", icon: Package },
    { name: "Máy cắt", href: "/worker/cat", icon: Scissors },
    { name: "Cá nhân", href: "/worker/ca-nhan", icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-20 admin-metal-panel/85 border-t border-white/10 z-50 pb-safe backdrop-blur-md overflow-hidden"
      aria-label="Điều hướng chính"
    >
      <div className="admin-metal-shine" />
      <div className="relative z-10 flex justify-around items-center h-full max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/worker"
              ? pathname === "/worker"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 h-full group"
            >
              {/* Nền nổi cho tab đang chọn */}
              <div
                className={`absolute inset-x-3 top-2 bottom-3 rounded-2xl transition-all ${
                  isActive
                    ? "bg-sky-500/15 border border-sky-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                    : "bg-transparent border border-transparent"
                }`}
                aria-hidden
              />

              {/* Chấm báo hiệu phía trên */}
              {isActive && (
                <span
                  className="absolute top-1 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                  aria-hidden
                />
              )}

              <div
                className={`relative z-10 flex flex-col items-center justify-center transition-transform ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              >
                <Icon
                  className={`w-[22px] h-[22px] mb-0.5 transition-colors ${
                    isActive ? "text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.55)]" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span
                  className={`text-[10.5px] font-bold transition-colors tracking-wide ${
                    isActive ? "text-slate-100" : "text-slate-500"
                  }`}
                >
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
