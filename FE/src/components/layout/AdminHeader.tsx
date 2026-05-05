"use client";

import { useTransition, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Search, LogOut, Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiData } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";
import { formatRelativeVi } from "@/lib/format-relative-vi";
import { apiJson } from "@/lib/api";

type OrderBrief = {
  madh: number;
  trangthai: string;
  ngaytao: string;
  khachhang: { hoten: string } | null;
};

type AccessRow = {
  mayc: number;
  hoten: string;
  tendangnhap: string;
  vaitro: string;
  trangthai: string;
  ngaytao: string;
};

type FeedItem = {
  id: string;
  title: string;
  body: string;
  at: string;
  href: string;
  urgent?: boolean;
};

function buildFeed(orders: OrderBrief[], access: AccessRow[]): FeedItem[] {
  const out: FeedItem[] = [];
  for (const a of access.filter((x) => x.trangthai === "PENDING")) {
    const roleLabel = a.vaitro === "WORKER" ? "Thợ" : a.vaitro === "ADMIN" ? "Quản trị" : a.vaitro;
    out.push({
      id: `acc-${a.mayc}`,
      title: "Yêu cầu cấp quyền",
      body: `${a.hoten} · đăng nhập ${a.tendangnhap} · ${roleLabel}`,
      at: a.ngaytao,
      href: "/admin/yeu-cau-cap-quyen",
      urgent: true,
    });
  }
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.ngaytao).getTime() - new Date(a.ngaytao).getTime(),
  );
  for (const o of sortedOrders.slice(0, 12)) {
    out.push({
      id: `ord-${o.madh}`,
      title: `Đơn hàng DH-${o.madh}`,
      body: `${o.khachhang?.hoten ?? "Khách hàng"} · ${formatOrderStatus(o.trangthai)}`,
      at: o.ngaytao,
      href: `/admin/don-hang/${o.madh}`,
    });
  }
  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export default function AdminHeader() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showNotifications, setShowNotifications] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [readAtMs, setReadAtMs] = useState(0);
  const [displayName, setDisplayName] = useState("Quản trị viên");
  const [accountEmail, setAccountEmail] = useState("");

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
        const name =
          meta?.hoten ||
          meta?.hoTen ||
          meta?.full_name ||
          user?.email?.split("@")[0] ||
          "Quản trị viên";
        setDisplayName(name);
        setAccountEmail(user?.email ?? "");
      });
  }, []);

  const loadReadState = useCallback(async () => {
    try {
      const data = await apiData<{ dadoctoi: string | null }>("/api/admin/notifications/read-state");
      const t = data?.dadoctoi ? new Date(data.dadoctoi).getTime() : 0;
      setReadAtMs(Number.isNaN(t) ? 0 : t);
    } catch {
      // fallback: keep 0 to avoid hiding notifs
      setReadAtMs(0);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError("");
    try {
      const [orders, access] = await Promise.all([
        apiData<OrderBrief[]>("/api/admin/orders-list"),
        apiData<AccessRow[]>("/api/admin/access-requests").catch(() => [] as AccessRow[]),
      ]);
      setFeed(buildFeed(orders ?? [], access ?? []));
    } catch (err: unknown) {
      setFeed([]);
      setFeedError(err instanceof Error ? err.message : String(err));
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
    void loadReadState();
  }, [loadFeed, loadReadState]);

  useEffect(() => {
    if (showNotifications) void loadFeed();
  }, [showNotifications, loadFeed]);

  const unreadCount = feed.filter((i) => new Date(i.at).getTime() > readAtMs).length;

  const handleLogout = async () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  };

  const handleMarkRead = () => {
    void (async () => {
      await apiJson("/api/admin/notifications/mark-read", { method: "POST" }).catch(() => null);
      await loadReadState();
    })();
  };

  const openItem = (item: FeedItem) => {
    setShowNotifications(false);
    router.push(item.href);
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 admin-metal-panel/70 backdrop-blur-md border-b border-white/5 sticky top-0 z-20 print:hidden">
      <div className="admin-metal-shine" />

      <div className="flex-1 max-w-md">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
          </div>
          <input
            type="text"
            className="bg-white/5 border border-white/10 text-sm rounded-lg text-gray-200 focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2 transition-all placeholder-gray-600 focus:bg-white/10 relative z-10"
            placeholder="Tìm kiếm mã đơn hàng, vật tư..."
          />
        </div>
      </div>

      <div className="flex items-center space-x-4 relative z-10">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full transition-colors relative ${showNotifications ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            title="Thông báo"
            aria-label="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full border border-[#0a0a0c]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#12141a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-white/5 flex justify-between items-center gap-2">
                <h3 className="font-bold text-gray-100">Hoạt động gần đây</h3>
                <button
                  type="button"
                  onClick={handleMarkRead}
                  className="text-xs text-blue-400 cursor-pointer hover:underline shrink-0"
                >
                  Đánh dấu đã đọc
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {feedLoading ? (
                  <div className="p-6 flex justify-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" aria-label="Đang tải" />
                  </div>
                ) : feedError ? (
                  <div className="p-4 text-xs text-red-300">{feedError}</div>
                ) : feed.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    Chưa có dữ liệu. Đơn hàng và yêu cầu cấp quyền chờ duyệt sẽ hiển thị tại đây.
                  </div>
                ) : (
                  feed.map((item) => {
                    const isNew = new Date(item.at).getTime() > readAtMs;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openItem(item)}
                        className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${isNew ? "bg-blue-500/5" : ""} ${item.urgent ? "border-l-2 border-l-amber-400" : ""}`}
                      >
                        <p className="text-sm font-bold text-gray-200">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.body}</p>
                        <p className="text-[10px] text-gray-500 mt-2">{formatRelativeVi(item.at)}</p>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-2 border-t border-white/5 flex justify-center gap-3 text-xs">
                <Link
                  href="/admin/don-hang"
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={() => setShowNotifications(false)}
                >
                  Đơn hàng
                </Link>
                <span className="text-gray-600">·</span>
                <Link
                  href="/admin/yeu-cau-cap-quyen"
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={() => setShowNotifications(false)}
                >
                  Cấp quyền
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-200">{displayName}</p>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{accountEmail || "—"}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <button
          type="button"
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
