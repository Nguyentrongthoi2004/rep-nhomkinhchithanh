/** Mở rộng Express Request để chứa ngữ cảnh người dùng đã xác thực. */
export {};

export type AuthUser = {
  /** ID người dùng Supabase Auth (uuid) */
  authId: string;
  /** ID người dùng nghiệp vụ MiniERP (nguoidung.mand) */
  mand: number;
  /** Tên đăng nhập (nguoidung.tendangnhap), đã chuẩn hóa chữ thường */
  tendangnhap: string;
  /** Email đầy đủ dùng bởi Supabase Auth */
  email: string;
  /** Vai trò nghiệp vụ */
  vaitro: "ADMIN" | "WORKER";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** ID ngắn, ngẫu nhiên, dùng để đối chiếu log theo yêu cầu */
      requestId?: string;
    }
  }
}
