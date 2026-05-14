"use client";

import { useTransition, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Hexagon,
  Inbox,
  Loader2,
  LogOut,
  Menu,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiData, apiJson } from "@/lib/api";
import { formatRelativeVi } from "@/lib/format-relative-vi";
import { NAV_ITEMS } from "./AdminSidebar";

type NotificationItem = {
  matb: number;
  title: string;
  body: string;
  type: string;
  href: string | null;
  relatedType: string | null;
  relatedId: number | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

const TYPE_LABELS: Record<string, string> = {
  phan_cong: "Phân công",
  assignment: "Phân công",
  su_co: "Sự cố",
  issue: "Sự cố",
  thanh_toan: "Thanh toán",
  payment: "Thanh toán",
  don_hang: "Đơn hàng",
  order: "Đơn hàng",
  he_thong: "Hệ thống",
  system: "Hệ thống",
};

function notificationTypeLabel(type: string) {
  return TYPE_LABELS[type] ?? "Thông báo";
}

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
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

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const data = await apiData<NotificationsResponse>("/api/admin/notifications");
      setNotifications(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setNotifications([]);
      setUnreadCount(0);
      if (message.toLowerCase().includes("route not found")) {
        setNotificationsError("");
        return;
      }
      setNotificationsError(message);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (showNotifications) void loadNotifications();
  }, [showNotifications, loadNotifications]);

  const handleLogout = async () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  };

  const refreshNotifications = async () => {
    await loadNotifications();
  };

  const handleMarkAllRead = () => {
    void (async () => {
      await apiJson("/api/admin/notifications/mark-all-read", { method: "POST" });
      await refreshNotifications();
    })();
  };

  const handleDeleteRead = () => {
    void (async () => {
      await apiJson("/api/admin/notifications/read", { method: "DELETE" });
      await refreshNotifications();
    })();
  };

  const handleDeleteOne = (item: NotificationItem) => {
    void (async () => {
      await apiJson(`/api/admin/notifications/${item.matb}`, { method: "DELETE" });
      await refreshNotifications();
    })();
  };

  const openItem = (item: NotificationItem) => {
    void (async () => {
      if (!item.isRead) {
        await apiJson(`/api/admin/notifications/${item.matb}/read`, { method: "POST" }).catch(() => null);
      }
      setShowNotifications(false);
      if (item.href) {
        router.push(item.href);
      } else {
        await refreshNotifications();
      }
    })();
  };

  return (
    <>
      <header className="h-16 flex items-center justify-between px-4 md:px-6 admin-metal-panel/70 backdrop-blur-md border-b border-white/5 sticky top-0 z-20 print:hidden">
        <div className="admin-metal-shine" />

        <div className="flex items-center md:hidden relative z-10 mr-3">
          <button
            type="button"
            onClick={() => setShowMobileMenu(true)}
            className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
            aria-label="Mở menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 max-w-md hidden md:block">
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
              className={`p-2 rounded-full transition-colors relative ${
                showNotifications ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
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
              <div className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-24px)] bg-[#12141a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-100">Thông báo</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Không có thông báo chưa đọc"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        disabled={unreadCount === 0}
                        className="p-2 rounded-lg text-gray-400 hover:text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40 disabled:hover:bg-transparent"
                        title="Đánh dấu đã đọc"
                        aria-label="Đánh dấu đã đọc"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteRead}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Xóa tất cả đã đọc"
                        aria-label="Xóa tất cả đã đọc"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="p-6 flex justify-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin" aria-label="Đang tải" />
                    </div>
                  ) : notificationsError ? (
                    <div className="p-4 text-xs text-red-300">{notificationsError}</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      <Inbox className="w-7 h-7 mx-auto mb-2 text-gray-600" />
                      Chưa có thông báo.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.matb}
                        className={`p-4 border-b border-white/5 transition-colors ${
                          item.isRead ? "bg-transparent" : "bg-blue-500/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => openItem(item)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                {notificationTypeLabel(item.type)}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  item.isRead
                                    ? "text-gray-400 border-white/10 bg-white/5"
                                    : "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                                }`}
                              >
                                {item.isRead ? "Đã đọc" : "Chưa đọc"}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-gray-100 mt-2">{item.title}</p>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-3">{item.body}</p>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <p className="text-[10px] text-gray-500">{formatRelativeVi(item.createdAt)}</p>
                              {item.href ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-300">
                                  Xem chi tiết
                                  <ExternalLink className="w-3 h-3" />
                                </span>
                              ) : null}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOne(item)}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                            title="Xóa thông báo"
                            aria-label="Xóa thông báo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-white/10 mx-2" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-200">{displayName}</p>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{accountEmail || "-"}</p>
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

      {showMobileMenu && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
          <div className="relative w-64 max-w-[80%] h-full flex flex-col bg-[#0a0a0c] border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
              <div className="brand-mark flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Hexagon className="w-4 h-4 text-blue-400" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-gray-100">Chí Thành</div>
                  <div className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">Mini ERP</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? "bg-blue-500/10 text-blue-400" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-blue-400" : "text-gray-500"}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
