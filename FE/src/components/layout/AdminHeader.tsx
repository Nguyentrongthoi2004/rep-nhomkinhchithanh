"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, LogOut, Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminHeader() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[#0a0a0c]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
      
      {/* Search Bar Placeholder */}
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
          </div>
          <input
            type="text"
            className="bg-white/5 border border-white/10 text-sm rounded-lg text-gray-200 focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2 transition-all placeholder-gray-600 focus:bg-white/10"
            placeholder="Tìm kiếm mã đơn hàng, vật tư..."
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0a0a0c]"></span>
        </button>

        <div className="h-8 w-px bg-white/10 mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-200">Quản trị viên</p>
            <p className="text-xs text-gray-500">admin@nhomkinh.com</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <button 
          onClick={handleLogout}
          disabled={isPending}
          className="ml-2 flex items-center justify-center p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
          title="Đăng xuất"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
        </button>
      </div>

    </header>
  );
}
