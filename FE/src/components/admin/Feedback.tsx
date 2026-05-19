"use client";

import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";

export type NoticeTone = "ok" | "warn" | "error" | "info";

export type NoticeState = {
  tone: NoticeTone;
  text: string;
};

const noticeClass: Record<NoticeTone, string> = {
  ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  warn: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  error: "border-red-500/25 bg-red-500/10 text-red-200",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-200",
};

export function InlineNotice({ notice, onClose }: { notice: NoticeState | null; onClose?: () => void }) {
  if (!notice) return null;
  const Icon = notice.tone === "ok" ? CheckCircle2 : notice.tone === "info" ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${noticeClass[notice.tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{notice.text}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="rounded p-0.5 opacity-70 hover:opacity-100" title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "danger",
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warn" | "ok";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const confirmClass =
    tone === "ok"
      ? "bg-emerald-600 hover:bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-600 hover:bg-amber-500"
        : "bg-red-600 hover:bg-red-500";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-2xl">
        <div className="border-b border-white/10 bg-[#0a0a0c] px-5 py-4">
          <h2 className="flex items-center text-base font-bold text-white">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-300" />
            {title}
          </h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-300">{description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-11 rounded-xl bg-white/5 font-bold text-gray-200 hover:bg-white/10 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex h-11 items-center justify-center rounded-xl font-bold text-white disabled:opacity-60 ${confirmClass}`}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
