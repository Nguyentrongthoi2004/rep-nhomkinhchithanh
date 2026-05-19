"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, X, StickyNote, Package, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ─── Kiểu dữ liệu ───
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
  dateKey: string; // Định dạng "YYYY-MM-DD"
  text: string;
  createdAt: string;
}

const NOTES_KEY = "worker_calendar_notes_v1";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function WorkerCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  // Dữ liệu thật từ Supabase
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Ghi chú cá nhân (lưu trong localStorage)
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  // ─── Tải phân công của thợ ───
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

  // ─── Tải ghi chú từ localStorage ───
  useEffect(() => {
    const saved = localStorage.getItem(NOTES_KEY);
    if (saved) { try { setNotes(JSON.parse(saved)); } catch { /* Bỏ qua dữ liệu ghi chú lỗi */ } }
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
      createdAt: new Date().toISOString(),
    };
    saveNotes([newNote, ...notes]);
    setNoteText("");
    setShowNoteModal(false);
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  };

  // ─── Logic lịch ───
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const today = new Date();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Nhiệm vụ có ngày tạo trong tháng này
  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter(t => {
      if (!t.donhang?.ngaytao) return false;
      return t.donhang.ngaytao.startsWith(dateStr);
    });
  };

  // Ghi chú cho ngày
  const getNotesForDay = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return notes.filter(n => n.dateKey === dateKey);
  };

  // Ngày được chọn
  const selectedDateKey = selectedDay !== null
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const selectedTasks = selectedDay !== null ? getTasksForDay(selectedDay) : [];
  const selectedNotes = selectedDateKey ? notes.filter(n => n.dateKey === selectedDateKey) : [];

  return (
    <div className="min-h-full bg-[#030508] text-gray-200 flex flex-col">

      {/* Đầu trang */}
      <div className="pt-10 pb-6 px-5 bg-linear-to-b from-purple-900/30 to-[#030508] sticky top-0 z-20">
        <h1 className="text-xl font-bold text-gray-100 flex items-center">
          <CalendarIcon className="w-6 h-6 mr-2 text-purple-400" />
          Lịch Làm Việc Của Tôi
        </h1>
      </div>

      {/* Điều hướng tháng */}
      <div className="px-5 mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 bg-white/5 rounded-full hover:bg-white/10" aria-label="Tháng trước" title="Tháng trước">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-base font-bold text-gray-200">
          Tháng {month + 1}, {year}
        </h2>
        <button onClick={nextMonth} className="p-2 bg-white/5 rounded-full hover:bg-white/10" aria-label="Tháng sau" title="Tháng sau">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Lưới lịch */}
      <div className="px-5">
        <div className="bg-[#12141a] rounded-2xl p-4 border border-white/5 shadow-lg">
          {/* Tiêu đề các thứ trong tuần */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-500">{d}</div>
            ))}
          </div>

          {/* Ô ngày */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square" />
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
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative border
                    ${isSelected ? "border-purple-500 bg-purple-500/20" : "border-transparent hover:bg-white/5"}
                    ${isToday && !isSelected ? "bg-white/10 border-white/20" : ""}
                  `}
                >
                  <span className={`text-xs font-bold ${isToday ? "text-white" : "text-gray-400"}`}>{day}</span>
                  <div className="flex space-x-0.5 mt-0.5">
                    {dayTasks.length > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                    {dayNotes.length > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chú giải */}
          <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center text-[10px] text-gray-500">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" /> Việc Xưởng
            </div>
            <div className="flex items-center text-[10px] text-gray-500">
              <div className="w-2 h-2 rounded-full bg-amber-400 mr-1.5" /> Ghi Chú
            </div>
          </div>
        </div>
      </div>

      {/* Khung chi tiết ngày đang chọn */}
      {selectedDay !== null && (
        <div className="px-5 mt-5 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-300">
              {selectedDay}/{month + 1}/{year}
            </h3>
            <button
              onClick={() => { setShowNoteModal(true); setNoteText(""); }}
              className="flex items-center text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Thêm Ghi Chú
            </button>
          </div>

          {/* Nhiệm vụ trong ngày */}
          {loadingTasks ? (
            <div className="flex items-center text-xs text-gray-500 mb-3">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Đang tải...
            </div>
          ) : selectedTasks.length === 0 && selectedNotes.length === 0 ? (
            <p className="text-xs text-gray-600 py-4 text-center">
              Không có việc hoặc ghi chú nào. Thêm ghi chú để nhắc nhở bản thân.
            </p>
          ) : null}

          {/* Công việc sản xuất */}
          {selectedTasks.map(t => (
            <div key={t.mapc} className="bg-[#12141a] p-3 rounded-xl border border-white/5 flex items-start mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 mr-3 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-200">
                  DH-{t.madh} · {t.donhang?.khachhang?.hoten || "Không rõ KH"}
                </p>
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <Package className="w-3 h-3 mr-1" />
                  Việc Xưởng ·{" "}
                  <span className={`ml-1 font-medium ${
                    t.trangthai === "HOAN_THANH" ? "text-emerald-400"
                    : t.trangthai === "DANG_THUC_HIEN" ? "text-blue-400"
                    : "text-gray-400"
                  }`}>
                    {t.trangthai === "HOAN_THANH" ? "Đã Xong"
                      : t.trangthai === "DANG_THUC_HIEN" ? "Đang Làm"
                      : "Chờ Nhận"}
                  </span>
                </p>
              </div>
            </div>
          ))}

          {/* Ghi chú */}
          {selectedNotes.map(note => (
            <div key={note.id} className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/15 flex items-start mb-2">
              <StickyNote className="w-4 h-4 text-amber-400 mr-3 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-200/80 flex-1 leading-relaxed">{note.text}</p>
              <button
                onClick={() => deleteNote(note.id)}
                className="text-gray-600 hover:text-red-400 ml-2 transition-colors"
                aria-label="Xóa ghi chú"
                title="Xóa ghi chú"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hộp thoại ghi chú */}
      {showNoteModal && (
        <div className="fixed inset-0 z-200 flex items-end justify-center p-4 pb-[80px] bg-black/70 backdrop-blur-sm">
          <div className="bg-[#12141a] border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-gray-100 flex items-center">
                <StickyNote className="w-4 h-4 mr-2 text-amber-400" />
                Thêm Ghi Chú — Ngày {selectedDay}/{month + 1}
              </h3>
              <button onClick={() => setShowNoteModal(false)} aria-label="Đóng" title="Đóng"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={4}
              className="w-full bg-[#030508] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none resize-none mb-4"
              placeholder="VD: Nhớ mang dụng cụ đo tới nhà anh Hùng. Ghé kho lấy kính 8mm..."
              autoFocus
            />
            <div className="flex space-x-3">
              <button onClick={() => setShowNoteModal(false)} className="flex-1 py-2.5 bg-white/5 text-gray-300 font-bold rounded-lg">Hủy</button>
              <button
                onClick={addNote}
                disabled={!noteText.trim()}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
              >
                Lưu Ghi Chú
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
