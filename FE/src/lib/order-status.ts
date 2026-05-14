/** Mã trạng thái đơn hàng từ backend sang nhãn hiển thị tiếng Việt. */
const LABELS: Record<string, string> = {
  BAO_GIA_NHAP: "Chờ duyệt giá",
  DA_DUYET_GIA: "Đã duyệt giá",
  KHAO_SAT: "Tiếp nhận",
  DA_COC: "Đã cọc",
  DA_THANH_TOAN: "Đã thanh toán",
  DANG_GIA_CONG: "Đang gia công",
  DANG_LAP_DAT: "Đang lắp đặt",
  HOAN_THANH: "Hoàn thành",
  DA_HUY: "Đã hủy",
};

export function formatOrderStatus(code: string): string {
  return LABELS[code] ?? code;
}
