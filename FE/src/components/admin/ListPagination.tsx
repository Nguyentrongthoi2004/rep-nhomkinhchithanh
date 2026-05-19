"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
};

// Phân trang dùng lại cho các bảng quản trị. Thành phần này chỉ nhận số liệu đã tính sẵn,
// còn logic lọc/trang nằm ở page để mỗi màn tự quyết định nguồn ngày/search.
export function ListPagination({ page, pageCount, total, start, end, onPageChange }: Props) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/5 px-4 py-3 text-sm text-gray-400 sm:flex-row sm:items-center sm:justify-between">
      <div>
        Hiển thị <span className="font-semibold text-gray-200">{total === 0 ? 0 : start + 1}-{end}</span> /{" "}
        <span className="font-semibold text-gray-200">{total}</span> dòng
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold text-gray-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Trước
        </button>
        <div className="rounded-lg border border-white/10 px-3 py-2 font-mono text-gray-200">
          {page}/{pageCount}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold text-gray-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
