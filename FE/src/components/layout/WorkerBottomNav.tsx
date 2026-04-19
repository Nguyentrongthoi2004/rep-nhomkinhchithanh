"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Scissors, User } from "lucide-react";

export default function WorkerBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Việc hôm nay", href: "/worker", icon: Home },
    { name: "Kho phôi", href: "/worker/kho", icon: Package },
    { name: "Máy cắt", href: "/worker/cat", icon: Scissors },
    { name: "Cá nhân", href: "/worker/ca-nhan", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#0a0a0c] border-t border-white/10 z-50 pb-safe">
      <div className="flex justify-around items-center h-full max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-full h-full space-y-1"
            >
              {/* Highlight active indicator */}
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>
              )}
              
              <Icon 
                className={`w-7 h-7 mb-0.5 transition-colors ${
                  isActive ? "text-blue-400" : "text-gray-500"
                }`} 
              />
              <span 
                className={`text-[11px] font-medium transition-colors ${
                  isActive ? "text-white" : "text-gray-500"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
