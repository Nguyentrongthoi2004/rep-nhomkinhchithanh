-- =====================================================
-- SCRIPT 00: CLEAN RESET — XÓA SẠCH TOÀN BỘ SCHEMA CŨ
-- =====================================================
-- Chạy TRƯỚC TẤT CẢ các script khác.
-- Xóa cả 2 naming convention (có dấu gạch và không dấu gạch)
-- để đảm bảo không còn bảng trùng lặp.
-- =====================================================

-- ===========================
-- 1. XÓA CÁC BẢNG (NO UNDERSCORE — schema cũ FE)
-- ===========================
DROP TABLE IF EXISTS hinhanh CASCADE;
DROP TABLE IF EXISTS giaodich CASCADE;
DROP TABLE IF EXISTS nhatkygiacong CASCADE;
DROP TABLE IF EXISTS chitietcat CASCADE;
DROP TABLE IF EXISTS sodocat CASCADE;
DROP TABLE IF EXISTS phancong CASCADE;
DROP TABLE IF EXISTS chitietdh CASCADE;
DROP TABLE IF EXISTS donhang CASCADE;
DROP TABLE IF EXISTS khothanhphoi CASCADE;
DROP TABLE IF EXISTS lonhap CASCADE;
DROP TABLE IF EXISTS vattu CASCADE;
DROP TABLE IF EXISTS khachhang CASCADE;
DROP TABLE IF EXISTS nguoidung CASCADE;
DROP TABLE IF EXISTS danhmuc CASCADE;
DROP TABLE IF EXISTS quytac CASCADE;

-- ===========================
-- 2. XÓA CÁC BẢNG (WITH UNDERSCORE — schema BE mới)
-- ===========================
DROP TABLE IF EXISTS hinh_anh CASCADE;
DROP TABLE IF EXISTS giao_dich CASCADE;
DROP TABLE IF EXISTS nhat_ky_gia_cong CASCADE;
DROP TABLE IF EXISTS chi_tiet_cat CASCADE;
DROP TABLE IF EXISTS so_do_cat CASCADE;
DROP TABLE IF EXISTS phan_cong CASCADE;
DROP TABLE IF EXISTS chi_tiet_dh CASCADE;
DROP TABLE IF EXISTS don_hang CASCADE;
DROP TABLE IF EXISTS kho_thanh_phoi CASCADE;
DROP TABLE IF EXISTS lo_nhap CASCADE;
DROP TABLE IF EXISTS vat_tu CASCADE;
DROP TABLE IF EXISTS khach_hang CASCADE;
DROP TABLE IF EXISTS nguoi_dung CASCADE;
DROP TABLE IF EXISTS danh_muc CASCADE;
DROP TABLE IF EXISTS quy_tac CASCADE;

-- ===========================
-- 3. XÓA CÁC BẢNG CŨ (PascalCase from 01_schema_dowes.sql)
-- ===========================
DROP TABLE IF EXISTS "ChiTietCat" CASCADE;
DROP TABLE IF EXISTS "SoDoCat" CASCADE;
DROP TABLE IF EXISTS "NhatKyGC" CASCADE;
DROP TABLE IF EXISTS "PhanCong" CASCADE;
DROP TABLE IF EXISTS "ChiTietDH" CASCADE;
DROP TABLE IF EXISTS "DonHang" CASCADE;
DROP TABLE IF EXISTS "KhachHang" CASCADE;
DROP TABLE IF EXISTS "KhoThanhPhoi" CASCADE;
DROP TABLE IF EXISTS "LoNhap" CASCADE;
DROP TABLE IF EXISTS "NguoiDung" CASCADE;
DROP TABLE IF EXISTS "VatTu" CASCADE;
DROP TABLE IF EXISTS "DanhMuc" CASCADE;
DROP TABLE IF EXISTS "QuyTac" CASCADE;

-- ===========================
-- 4. XÓA TẤT CẢ ENUM TYPES
-- ===========================
DROP TYPE IF EXISTS trang_thai_danh_muc CASCADE;
DROP TYPE IF EXISTS trang_thai_phoi CASCADE;
DROP TYPE IF EXISTS trang_thai_don_hang CASCADE;
DROP TYPE IF EXISTS vai_tro_nguoi_dung CASCADE;
DROP TYPE IF EXISTS trang_thai_nguoi_dung CASCADE;
DROP TYPE IF EXISTS trang_thai_phan_cong CASCADE;
DROP TYPE IF EXISTS trang_thai_so_do_cat CASCADE;
DROP TYPE IF EXISTS trang_thai_chi_tiet_cat CASCADE;
DROP TYPE IF EXISTS loai_su_kien CASCADE;
DROP TYPE IF EXISTS loai_giao_dich CASCADE;
DROP TYPE IF EXISTS phuong_thuc_thanh_toan CASCADE;

-- =====================================================
-- XONG! Hệ thống đã sạch. Chạy tiếp script 01.
-- =====================================================
