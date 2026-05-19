export type TimeFilter = "all" | "today" | "month" | "year";

export const DEFAULT_PAGE_SIZE = 8;

// Bộ lọc thời gian dùng chung cho các màn danh sách xử lý ở phía trình duyệt.
// So sánh theo lịch cục bộ của trình duyệt để khớp cách quản trị viên xem "hôm nay/tháng này".
export function matchesTimeFilter(value: string, filter: TimeFilter, now = new Date()) {
  if (filter === "all") return true;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const sameYear = date.getFullYear() === now.getFullYear();
  const sameMonth = sameYear && date.getMonth() === now.getMonth();
  const sameDate = sameMonth && date.getDate() === now.getDate();

  if (filter === "today") return sameDate;
  if (filter === "month") return sameMonth;
  return sameYear;
}

// Phân trang phía trình duyệt cho các bảng nhỏ/vừa. Hàm luôn trả page hợp lệ
// để giao diện không bị rỗng khi tìm kiếm/bộ lọc làm số trang giảm.
export function paginate<T>(items: T[], page: number, pageSize = DEFAULT_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageCount,
    start,
    end: Math.min(start + pageSize, items.length),
    items: items.slice(start, start + pageSize),
  };
}
