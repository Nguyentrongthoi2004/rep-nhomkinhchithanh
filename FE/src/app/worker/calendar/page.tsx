"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, X, StickyNote, Package, Loader2, Pin, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WorkerViewContext } from "../context";
import Link from "next/link";

const supabase = createClient();

interface WorkTask {
  mapc: number;
  madh: number;
  trangthai: string;
  donhang: {
    ngaytao: string;
    khachhang: { hoten: string } | null;
  } | null;
}

interface CalendarNote {
  id: string;
  dateKey: string; // "YYYY-MM-DD"
  text: string;
  category: "urgent" | "reminder" | "idea" | "general";
  createdAt: string;
}

const NOTES_KEY = "worker_calendar_notes_v1";
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const CATEGORY_STYLES = {
  urgent: {
    label: "Khẩn cấp",
    cardClass: "bg-rose-500/10 border-rose-500/30 text-rose-200",
    dotClass: "bg-rose-500",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/20"
  },
  reminder: {
    label: "Nhắc nhở",
    cardClass: "bg-amber-500/10 border-amber-500/30 text-amber-200",
    dotClass: "bg-amber-400",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/20"
  },
  idea: {
    label: "Ý tưởng",
    cardClass: "bg-cyan-500/10 border-cyan-500/30 text-cyan-200",
    dotClass: "bg-cyan-400",
    badgeClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20"
  },
  general: {
    label: "Ghi chú",
    cardClass: "bg-slate-500/10 border-slate-500/30 text-slate-200",
    dotClass: "bg-slate-400",
    badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/20"
  }
};

export default function WorkerCalendarPage() {
  const { viewMode } = useContext(WorkerViewContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  // Dữ liệu từ Supabase
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Ghi chú cá nhân (lưu trong localStorage)
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState<CalendarNote["category"]>("general");

  // Tải phân công của thợ
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData.session?.user?.email;
      if (!userEmail) { setLoadingTasks(false); return; }

      const { data: userRow } = await supabase
        .from("nguoidung")
        .select("mand")
        .eq("tendangnhap", userEmail)
        .single();

      if (!userRow) { setLoadingTasks(false); return; }

      const { data } = await supabase
        .from("phancong")
        .select(`
          mapc, madh, trangthai,
          donhang(ngaytao, khachhang(hoten))
        `)
        .eq("matho", userRow.mand)
        .in("trangthai", ["CHO_THUC_HIEN", "DANG_THUC_HIEN", "HOAN_THANH"]);

      setTasks((data as unknown as WorkTask[]) || []);
    } catch (e) {
      console.error("Lỗi tải lịch:", e);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(NOTES_KEY);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch {
        // Hủy nếu lỗi parse
      }
    }
    fetchTasks();
  }, [fetchTasks]);

  const saveNotes = (updated: CalendarNote[]) => {
    setNotes(updated);
    localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
  };

  const addNote = () => {
    if (!noteText.trim() || selectedDay === null) return;
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    const newNote: CalendarNote = {
      id: `note_${Date.now()}`,
      dateKey,
      text: noteText.trim(),
      category: noteCategory,
      createdAt: new Date().toISOString(),
    };
    saveNotes([newNote, ...notes]);
    setNoteText("");
    setNoteCategory("general");
    setShowNoteModal(false);
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const today = new Date();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Nhiệm vụ của thợ tương ứng ngày
  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter(t => {
      if (!t.donhang?.ngaytao) return false;
      return t.donhang.ngaytao.startsWith(dateStr);
    });
  };

  // Ghi chú của thợ tương ứng ngày
  const getNotesForDay = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return notes.filter(n => n.dateKey === dateKey);
  };

  const selectedDateKey = selectedDay !== null
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const selectedTasks = selectedDay !== null ? getTasksForDay(selectedDay) : [];
  const selectedNotes = selectedDateKey ? notes.filter(n => n.dateKey === selectedDateKey) : [];

  // Component render Grid lịch làm việc
  const CalendarGridBlock = () => (
    <div className={`bg-[#0d1118] p-5 border border-slate-800 shadow-sm ${viewMode === "pc" ? "rounded-2xl" : "rounded-3xl"}`}>
      {/* Navigator tháng */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors" aria-label="Tháng trước" title="Tháng trước">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-sm font-black text-white uppercase tracking-wider">
          Tháng {month + 1} / {year}
        </h2>
        <button onClick={nextMonth} className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors" aria-label="Tháng sau" title="Tháng sau">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">{d}</div>
        ))}
      </div>

      {/* Day Cells */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square opacity-20 bg-white/[0.01] rounded-xl" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayTasks = getTasksForDay(day);
          const dayNotes = getNotesForDay(day);
          const isToday = isCurrentMonth && day === today.getDate();
          const isSelected = day === selectedDay;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day === selectedDay ? null : day)}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-between p-2.5 transition-all relative border ${
                isSelected
                  ? "border-purple-500 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                  : isToday
                    ? "bg-white/5 border-white/15 shadow-[0_0_8px_rgba(255,255,255,0.05)]"
                    : "border-transparent bg-white/[0.01] hover:bg-white/5"
              }`}
            >
              <span className={`text-xs font-black ${isToday && !isSelected ? "text-purple-400" : isSelected ? "text-white" : "text-gray-400"}`}>{day}</span>

              {/* Badges indicators chi tiết */}
              <div className="flex flex-col gap-0.5 w-full items-center">
                {dayTasks.length > 0 && (
                  <span className="w-full text-[7px] text-center bg-blue-500/15 text-blue-400 py-0.5 rounded-sm font-black border border-blue-500/20 truncate">
                    {dayTasks.length} việc
                  </span>
                )}
                {dayNotes.length > 0 && (
                  <span className="w-full text-[7px] text-center bg-amber-500/15 text-amber-400 py-0.5 rounded-sm font-black border border-amber-500/20 truncate">
                    {dayNotes.length} note
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5 justify-center text-[10px] text-gray-500 font-bold">
        <span className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 shadow-[0_0_5px_rgba(59,130,246,0.5)]" /> Việc từ Admin
        </span>
        <span className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5 shadow-[0_0_5px_rgba(245,158,11,0.5)]" /> Ghi chú cá nhân
        </span>
      </div>
    </div>
  );

  // Component render Thông tin ngày được chọn
  const DayDetailsBlock = () => (
    <div className="space-y-4">
      {selectedDay !== null && (
        <div className={`bg-[#0d1118] border border-slate-800 p-5 ${viewMode === "pc" ? "rounded-2xl" : "rounded-3xl"}`}>
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Nhật Ký Ngày Chọn</p>
              <h3 className="text-base font-black text-white mt-0.5">
                Ngày {selectedDay} Tháng {month + 1}, {year}
              </h3>
            </div>
            <button
              onClick={() => { setShowNoteModal(true); setNoteText(""); }}
              className="flex items-center text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Thêm ghi chú
            </button>
          </div>

          {loadingTasks ? (
            <div className="flex items-center text-xs text-gray-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-purple-500" /> Đang kiểm tra lịch trình...
            </div>
          ) : selectedTasks.length === 0 && selectedNotes.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-600">
              <Pin className="w-8 h-8 text-gray-800 mx-auto mb-2" />
              Không ghi nhận phân công hay nhắc nhở nào cho ngày này.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Nhiệm vụ gia công */}
              {selectedTasks.map(t => (
                <div key={t.mapc} className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/15 flex items-start">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 mr-3 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-gray-200">
                      DH-{t.madh} · {t.donhang?.khachhang?.hoten || "Không rõ KH"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-400" />
                      <span>PC-{t.mapc} · </span>
                      <span className={`font-bold ${
                        t.trangthai === "HOAN_THANH" ? "text-emerald-400"
                        : t.trangthai === "DANG_THUC_HIEN" ? "text-blue-400"
                        : "text-amber-400"
                      }`}>
                        {t.trangthai === "HOAN_THANH" ? "Đã xong"
                          : t.trangthai === "DANG_THUC_HIEN" ? "Đang làm"
                          : "Chờ thợ nhận"}
                      </span>
                    </p>
                  </div>
                  <Link href={`/worker/tasks?mapc=${t.mapc}`} className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-1 rounded-lg ml-2 font-bold hover:bg-blue-500/20">
                    Xem chi tiết
                  </Link>
                </div>
              ))}

              {/* Ghi chú cá nhân */}
              {selectedNotes.map(note => {
                const style = CATEGORY_STYLES[note.category];
                return (
                  <div key={note.id} className={`p-4 rounded-2xl border flex items-start relative overflow-hidden ${style.cardClass}`}>
                    <div className="absolute top-0 right-0 w-8 h-8 opacity-10 bg-white/20 transform rotate-45 translate-x-3 -translate-y-3" />
                    <Pin className="w-4 h-4 mr-3 mt-1.5 shrink-0 text-current opacity-70" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase border ${style.badgeClass}`}>
                          {style.label}
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {new Date(note.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-200 mt-2 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-gray-500 hover:text-rose-400 p-1 shrink-0 ml-3 transition-colors"
                      aria-label="Xóa ghi chú"
                      title="Xóa ghi chú"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-full bg-[#030508] text-gray-200 flex flex-col">
      {/* Header Sticky */}
      <div className={`${viewMode === "pc" ? "px-6 pt-7 pb-5" : "pt-10 pb-4 px-5 bg-linear-to-b from-purple-900/30 to-[#030508] sticky top-0 z-20"}`}>
        <div className="w-full max-w-[1120px] mx-auto">
          <h1 className="text-lg font-black text-white flex items-center tracking-tight">
            <CalendarIcon className="w-5 h-5 mr-2 text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]" /> Lịch Sản Xuất & Ghi Chú Cá Nhân
          </h1>
          <p className="text-[10px] text-gray-500 mt-0.5">Theo dõi lịch bàn giao đơn hàng và quản lý công việc riêng tại xưởng.</p>
        </div>
      </div>

      {/* Main Container */}
      <div className={`flex-1 ${viewMode === "pc" ? "w-full max-w-[1120px] mx-auto px-6 pb-12" : "w-full px-4 pb-8"}`}>
        {viewMode === "pc" ? (
          // CHẾ ĐỘ PC: Giao diện 2 Cột song song rộng rãi
          <div className="grid grid-cols-12 gap-6 items-start">
            <div className="col-span-12 lg:col-span-7">
              <CalendarGridBlock />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <DayDetailsBlock />
            </div>
          </div>
        ) : (
          // CHẾ ĐỘ MOBILE: Cột dọc cuộn
          <div className="space-y-4">
            <CalendarGridBlock />
            <DayDetailsBlock />
          </div>
        )}
      </div>

      {/* Modal thêm ghi chú */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 pb-[84px] bg-black/85 backdrop-blur-sm sm:items-center sm:pb-3">
          <div className="bg-[#12141a] border border-white/10 rounded-3xl w-full max-w-md p-5 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-white flex items-center">
                <StickyNote className="w-4 h-4 mr-2 text-amber-400" />
                Thêm Nhắc Nhở — Ngày {selectedDay}/{month + 1}
              </h3>
              <button onClick={() => setShowNoteModal(false)} aria-label="Đóng" title="Đóng" className="p-1 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Select category/theme priority */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Phân Loại Độ Ưu Tiên:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(CATEGORY_STYLES) as CalendarNote["category"][]).map(cat => {
                  const style = CATEGORY_STYLES[cat];
                  const isSelected = noteCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNoteCategory(cat)}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all text-center ${
                        isSelected
                          ? `${style.badgeClass} bg-white/5 font-extrabold shadow-sm`
                          : "bg-black/20 border-white/5 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={4}
              className="w-full bg-black/45 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none resize-none mb-4 font-sans leading-relaxed"
              placeholder="VD: Cắt nốt 2 khung nhôm cỏ Xingfa, dặn thợ phụ chuẩn bị gioăng cao su..."
              autoFocus
            />

            <div className="flex space-x-2 bg-black/20 p-2 -mx-5 -mb-5 border-t border-white/5 grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => setShowNoteModal(false)} className="py-3 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-colors">Hủy</button>
              <button
                onClick={addNote}
                disabled={!noteText.trim()}
                className="py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-purple-500/10 active:scale-98"
              >
                Lưu Nhắc Nhở
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
