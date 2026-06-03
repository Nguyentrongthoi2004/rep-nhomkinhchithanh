"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Calculator,
  CheckCheck,
  ClipboardList,
  ExternalLink,
  Home,
  Inbox,
  Loader2,
  Monitor,
  Package,
  Scissors,
  Settings,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiData, apiJson } from "@/lib/api";
import { formatRelativeVi } from "@/lib/format-relative-vi";
import { WorkerViewContext } from "./context";

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

type NotificationSummary = {
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

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [viewMode, setViewMode] = useState<"mobile" | "pc">("mobile");
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("worker_view_mode");
    const timer = setTimeout(() => {
      if (saved === "pc" || saved === "mobile") setViewMode(saved);
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleViewMode = () => {
    const next = viewMode === "mobile" ? "pc" : "mobile";
    setViewMode(next);
    localStorage.setItem("worker_view_mode", next);
  };

  const navItems = [
    { href: "/worker", icon: Home, label: "Tổng quan" },
    { href: "/worker/tasks", icon: ClipboardList, label: "Nhiệm vụ" },
    { href: "/worker/cat", icon: Scissors, label: "Máy cắt" },
    { href: "/worker/simulator", icon: Calculator, label: "Trợ lý cắt" },
    { href: "/worker/kho", icon: Package, label: "Kho phôi" },
    { href: "/worker/calendar", icon: CalendarDays, label: "Lịch" },
    { href: "/worker/ca-nhan", icon: Settings, label: "Cá nhân" },
  ];

  const isActivePath = (href: string) => {
    if (href === "/worker") return pathname === "/worker";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const data = await apiData<NotificationsResponse>("/api/worker/notifications?limit=20");
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

  const loadNotificationSummary = useCallback(async () => {
    try {
      const data = await apiData<NotificationSummary>("/api/worker/notifications/summary");
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void loadNotificationSummary();
    const timer = window.setInterval(() => {
      void loadNotificationSummary();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadNotificationSummary]);

  useEffect(() => {
    if (showNotifications) void loadNotifications();
  }, [showNotifications, loadNotifications]);

  const refreshNotifications = async () => {
    await loadNotifications();
  };

  const handleMarkAllRead = () => {
    void (async () => {
      try {
        await apiJson("/api/worker/notifications/mark-all-read", { method: "POST" });
        await refreshNotifications();
      } catch (err: unknown) {
        setNotificationsError(err instanceof Error ? err.message : String(err));
      }
    })();
  };

  const handleDeleteRead = () => {
    void (async () => {
      try {
        await apiJson("/api/worker/notifications/read", { method: "DELETE" });
        await refreshNotifications();
      } catch (err: unknown) {
        setNotificationsError(err instanceof Error ? err.message : String(err));
      }
    })();
  };

  const handleDeleteOne = (item: NotificationItem) => {
    void (async () => {
      try {
        await apiJson(`/api/worker/notifications/${item.matb}`, { method: "DELETE" });
        await refreshNotifications();
      } catch (err: unknown) {
        setNotificationsError(err instanceof Error ? err.message : String(err));
      }
    })();
  };

  const openNotification = (item: NotificationItem) => {
    void (async () => {
      try {
        if (!item.isRead) {
          await apiJson(`/api/worker/notifications/${item.matb}/read`, { method: "POST" }).catch(() => null);
        }
        setShowNotifications(false);
        if (item.href) {
          router.push(item.href);
        } else {
          await refreshNotifications();
        }
      } catch (err: unknown) {
        setNotificationsError(err instanceof Error ? err.message : String(err));
      }
    })();
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#07090d] text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <span className="text-xs font-bold uppercase tracking-wider">Đang khởi tạo xưởng...</span>
      </div>
    );
  }

  return (
    <WorkerViewContext.Provider value={{ viewMode, toggleViewMode }}>
      <div className="relative min-h-screen overflow-hidden bg-[#07090d] font-sans text-slate-200">
        {viewMode === "pc" ? (
          <div className="admin-metal-bg relative z-10 flex h-screen overflow-hidden">
            <div className="admin-metal-noise" />
            <aside className="admin-metal-panel relative flex w-[260px] shrink-0 flex-col overflow-hidden border-r border-white/5">
              <div className="admin-metal-shine" />
              <div className="border-b border-slate-800/70 px-5 py-5">
                <div className="relative z-10 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10">
                    <Scissors className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black text-white">Nhôm Kính Chí Thành</h2>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Worker console</p>
                  </div>
                </div>
              </div>

              <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {navItems.map((item) => {
                  const isActive = isActivePath(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex h-11 items-center gap-3 rounded-lg border px-3 text-sm font-bold transition-colors ${
                        isActive
                          ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
                          : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-white/[0.03] hover:text-slate-100"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-cyan-300" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="relative z-10 border-t border-slate-800/70 p-4">
                <button
                  onClick={() => setShowNotifications(true)}
                  className={`mb-3 flex h-11 w-full items-center justify-between rounded-lg border px-3 text-xs font-black uppercase tracking-wider transition-colors ${
                    showNotifications
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-cyan-300" />
                    Thông báo
                  </span>
                  {unreadCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] text-white shadow-[0_0_18px_rgba(244,63,94,0.35)]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </button>
                <div className="mb-3 rounded-lg border border-emerald-400/15 bg-emerald-400/5 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trạng thái</p>
                  <p className="mt-1 flex items-center text-xs font-black text-emerald-300">
                    <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                    Xưởng trực tuyến
                  </p>
                </div>
                <button
                  onClick={toggleViewMode}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 text-xs font-black uppercase tracking-wider text-slate-200 transition-colors hover:bg-slate-800"
                >
                  <Smartphone className="h-4 w-4 text-cyan-300" />
                  Dạng điện thoại
                </button>
              </div>
            </aside>

            <main className="relative z-10 min-w-0 flex-1 overflow-y-auto scroll-smooth">{children}</main>
          </div>
        ) : (
          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-slate-800/70 bg-[#090c11] shadow-[0_0_60px_rgba(0,0,0,0.85)]">
            <button
              onClick={() => setShowNotifications(true)}
              className={`absolute right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-transform active:scale-95 ${
                showNotifications ? "border-cyan-300/40 bg-cyan-500 text-white" : "border-slate-700 bg-slate-950/85 text-slate-200 backdrop-blur-md"
              }`}
              title="Thông báo"
              aria-label="Thông báo"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#090c11] bg-rose-500 px-1 text-[10px] font-black text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={toggleViewMode}
              className="fixed bottom-24 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-500 text-white shadow-[0_12px_28px_rgba(6,182,212,0.24)] transition-transform active:scale-95"
              title="Chuyển sang dạng máy tính"
              aria-label="Chuyển chế độ xem"
            >
              <Monitor className="h-5 w-5" />
            </button>

            <div className="flex-1 overflow-y-auto pb-[104px] no-scrollbar scroll-smooth">{children}</div>

            <nav className="fixed bottom-3 left-1/2 z-40 flex h-[66px] w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2 items-center justify-around rounded-2xl border border-slate-700/80 bg-[#111620]/95 px-2 shadow-[0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur-md">
              {navItems
                .filter((item) => item.href !== "/worker/cat")
                .map((item) => {
                  const isActive = isActivePath(item.href);
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className="group relative flex h-full w-16 flex-col items-center justify-center">
                      {isActive && (
                        <span className="absolute -top-px left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.65)]" />
                      )}
                      <div className={`rounded-xl p-1.5 transition-colors ${isActive ? "bg-cyan-400/10 text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}`}>
                        <Icon className="h-[22px] w-[22px]" />
                      </div>
                      <span className={`mt-1 text-[10px] font-bold transition-colors ${isActive ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
            </nav>
          </div>
        )}

        {showNotifications ? (
          <WorkerNotificationsPanel
            viewMode={viewMode}
            notifications={notifications}
            unreadCount={unreadCount}
            isLoading={notificationsLoading}
            error={notificationsError}
            onClose={() => setShowNotifications(false)}
            onRefresh={refreshNotifications}
            onMarkAllRead={handleMarkAllRead}
            onDeleteRead={handleDeleteRead}
            onDeleteOne={handleDeleteOne}
            onOpen={openNotification}
          />
        ) : null}
      </div>
    </WorkerViewContext.Provider>
  );
}

type WorkerNotificationsPanelProps = {
  viewMode: "mobile" | "pc";
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onMarkAllRead: () => void;
  onDeleteRead: () => void;
  onDeleteOne: (item: NotificationItem) => void;
  onOpen: (item: NotificationItem) => void;
};

function WorkerNotificationsPanel({
  viewMode,
  notifications,
  unreadCount,
  isLoading,
  error,
  onClose,
  onRefresh,
  onMarkAllRead,
  onDeleteRead,
  onDeleteOne,
  onOpen,
}: WorkerNotificationsPanelProps) {
  const panelClass =
    viewMode === "pc"
      ? "left-[280px] top-5 w-[390px] max-w-[calc(100vw-304px)]"
      : "inset-x-3 bottom-[86px] mx-auto w-[calc(100%-24px)] max-w-md";

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[1px]"
        aria-label="Đóng thông báo"
        onClick={onClose}
      />

      <section
        className={`fixed z-[80] overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#111721]/95 shadow-[0_28px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl ${panelClass}`}
      >
        <div className="border-b border-white/5 bg-cyan-400/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Trung tâm xưởng</p>
              <h3 className="mt-1 text-base font-black text-white">Thông báo worker</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {unreadCount > 0 ? `${unreadCount} tin cần xem` : "Mọi tin mới đã được xử lý"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/15 bg-emerald-400/5 text-emerald-300 transition-colors hover:bg-emerald-400/10 disabled:opacity-35"
                title="Đánh dấu tất cả đã đọc"
                aria-label="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDeleteRead}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-400/15 bg-rose-400/5 text-rose-300 transition-colors hover:bg-rose-400/10"
                title="Xóa tin đã đọc"
                aria-label="Xóa tin đã đọc"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 transition-colors hover:bg-slate-800"
                title="Đóng"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex max-h-[min(68dvh,520px)] flex-col">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tin gần nhất</span>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="text-[11px] font-black text-cyan-300 transition-colors hover:text-cyan-100"
            >
              Làm mới
            </button>
          </div>

          <div className="min-h-[220px] overflow-y-auto">
            {isLoading ? (
              <div className="flex h-[220px] flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
                <span className="text-xs font-bold">Đang tải thông báo...</span>
              </div>
            ) : error ? (
              <div className="m-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-200">
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex h-[220px] flex-col items-center justify-center px-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80">
                  <Inbox className="h-6 w-6 text-slate-500" />
                </div>
                <p className="mt-3 text-sm font-black text-white">Chưa có thông báo</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Khi có phân công, sự cố hoặc cập nhật đơn hàng, tin sẽ hiện ở đây.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.matb}
                  className={`border-b border-white/5 p-3.5 transition-colors ${
                    item.isRead ? "bg-transparent hover:bg-white/[0.025]" : "bg-cyan-400/[0.055] hover:bg-cyan-400/[0.08]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        item.isRead ? "bg-slate-600" : "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.7)]"
                      }`}
                    />
                    <button type="button" onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-200">
                          {notificationTypeLabel(item.type)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{formatRelativeVi(item.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm font-black leading-5 text-white">{item.title}</p>
                      {item.body ? <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">{item.body}</p> : null}
                      {item.href ? (
                        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-cyan-300">
                          Mở chi tiết
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteOne(item)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-400/10 hover:text-rose-300"
                      title="Xóa thông báo"
                      aria-label="Xóa thông báo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
