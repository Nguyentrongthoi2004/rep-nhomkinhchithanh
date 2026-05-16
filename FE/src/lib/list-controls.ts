export type TimeFilter = "all" | "today" | "month" | "year";

export const DEFAULT_PAGE_SIZE = 8;

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
