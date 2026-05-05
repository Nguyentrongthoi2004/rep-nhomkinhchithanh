/** Mã trạng thái đơn hàng (backend) → nhãn hiển thị tiếng Việt có dấu */
const LABELS: Record<string, string> = {
  BAO_GIA_NHAP: "Báo giá nháp",
  KHAO_SAT: "Khảo sát",
  DA_COC: "Đã cọc",
  DANG_GIA_CONG: "Đang gia công",
  DANG_LAP_DAT: "Đang lắp đặt",
  HOAN_THANH: "Hoàn thành",
  DA_HUY: "Đã hủy",
};

export function formatOrderStatus(code: string): string {
  return LABELS[code] ?? code;
}
