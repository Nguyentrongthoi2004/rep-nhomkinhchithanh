-- =====================================================
-- SCRIPT 03: TẠO TÀI KHOẢN ADMIN MASTER
-- =====================================================
-- Script này chèn bản ghi nghiệp vụ cho Master Admin
-- vào bảng nguoidung. Chạy SAU script 01 và 02.
--
-- LƯU Ý QUAN TRỌNG:
-- Bạn VẪN phải tạo Auth user trên Supabase Dashboard:
--   → Authentication → Users → Add User
--   → Email: nhomkinhchithanh2026@gmail.com
--   → Password: [mật khẩu bạn chọn]
--   → Tick "Auto Confirm User"
-- =====================================================

INSERT INTO nguoidung (tendangnhap, hoten, vaitro, sdt, trangthai)
VALUES (
    'nhomkinhchithanh2026@gmail.com',
    'Giám Đốc (Master Admin)',
    'ADMIN',
    '0900000000',
    'DANG_LAM'
)
ON CONFLICT (tendangnhap) DO NOTHING;

-- =====================================================
-- SAU KHI CHẠY XONG 4 SCRIPT (00 → 01 → 02 → 03):
--
-- 1. Vào Supabase Dashboard → Authentication → Users
-- 2. Nhấn "Add User" → nhập email + mật khẩu
-- 3. Đăng nhập qua FE tại /login
-- 4. Admin có thể tạo tài khoản Worker qua giao diện
--
-- KHÔNG CẦN ĐỤNG VÔ SUPABASE NỮA!
-- =====================================================
