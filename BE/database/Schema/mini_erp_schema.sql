-- =====================================================
-- MINI-ERP NHÔM KÍNH — CANONICAL DATABASE SCHEMA
-- PostgreSQL / Supabase
-- =====================================================
-- FILE NÀY LÀ REFERENCE CHÍNH THỨC.
-- Schema thực tế chạy trên Supabase nằm ở:
--   supabase_scripts/01_schema_final.sql
--
-- NAMING CONVENTION: lowercase, KHÔNG DẤU GẠCH DƯỚI
-- Mục đích: khớp 100% với code Frontend (Next.js)
-- =====================================================
-- Tổng: 15 bảng · 11 ENUM types · 18 indexes · RLS
-- =====================================================

-- =====================
-- ENUM TYPES (11)
-- =====================
-- trang_thai_danh_muc:     HOAT_DONG | NGUNG
-- trang_thai_phoi:         MOI | CON_DU | BO_DI
-- trang_thai_don_hang:     BAO_GIA_NHAP | KHAO_SAT | DA_COC | DANG_GIA_CONG | DANG_LAP_DAT | HOAN_THANH | DA_HUY
-- vai_tro_nguoi_dung:      ADMIN | WORKER
-- trang_thai_nguoi_dung:   DANG_LAM | NGHI_VIEC
-- trang_thai_phan_cong:    CHO_THUC_HIEN | DANG_THUC_HIEN | HOAN_THANH
-- trang_thai_so_do_cat:    CHO_DUYET | DANG_CAT | HOAN_THANH
-- trang_thai_chi_tiet_cat: CHO_CAT | DA_CAT | LOI
-- loai_su_kien:            CAT | LOI | BO_DI
-- loai_giao_dich:          DAT_COC | TAM_UNG | HOAN_TAT | HUY_DON
-- phuong_thuc_thanh_toan:  TIEN_MAT | CHUYEN_KHOAN

-- =====================
-- 15 BẢNG
-- =====================

-- Bảng 1: quytac — Hằng số vật lý sản xuất
--   maqt        VARCHAR(50)     PK
--   tenqt       VARCHAR(100)    NOT NULL
--   giatri      NUMERIC(10,2)   NOT NULL

-- Bảng 2: danhmuc — Nhóm vật tư
--   madm        SERIAL          PK
--   tendm       VARCHAR(100)    NOT NULL UNIQUE
--   mota        VARCHAR(255)
--   trangthai   trang_thai_danh_muc  DEFAULT 'HOAT_DONG'
--   ngaytao     TIMESTAMPTZ          DEFAULT NOW()

-- Bảng 3: nguoidung — Tài khoản Admin/Worker
--   mand            SERIAL          PK
--   tendangnhap     VARCHAR(50)     NOT NULL UNIQUE
--   hoten           VARCHAR(100)    NOT NULL
--   vaitro          vai_tro_nguoi_dung  NOT NULL
--   sdt             VARCHAR(15)
--   trangthai       trang_thai_nguoi_dung  DEFAULT 'DANG_LAM'

-- Bảng 4: khachhang — Hồ sơ khách hàng
--   makh        SERIAL          PK
--   hoten       VARCHAR(100)    NOT NULL
--   sdt         VARCHAR(15)     NOT NULL UNIQUE
--   diachi      VARCHAR(255)

-- Bảng 5: vattu — Master data vật tư
--   mavt                SERIAL          PK
--   madm                INT             FK → danhmuc(madm)
--   tenvt               VARCHAR(150)    NOT NULL
--   donvitinh           VARCHAR(20)     NOT NULL
--   chieudaimacdinh     INT             (mm, NULL nếu không phải nhôm thanh)
--   dongianhap          NUMERIC(15,2)   NOT NULL
--   dongiaban           NUMERIC(15,2)

-- Bảng 6: lonhap — Đợt nhập kho
--   malonhap    SERIAL          PK
--   ngaynhap    TIMESTAMPTZ     DEFAULT NOW()
--   nhacungcap  VARCHAR(150)

-- Bảng 7: khothanhphoi — Kho phôi nhôm (Immutable Identity)
--   maphoi              SERIAL          PK (KHÔNG BAO GIỜ thay đổi)
--   mavt                INT             FK → vattu(mavt)
--   malonhap            INT             FK → lonhap(malonhap)
--   chieudaibandau      INT             NOT NULL (mm)
--   chieudaihientai     INT             NOT NULL (mm)
--   trangthai           trang_thai_phoi DEFAULT 'MOI'
--   CONSTRAINT chk_chieudai CHECK (chieudaihientai >= 0 AND chieudaibandau > 0)

-- Bảng 8: donhang — Đơn hàng + vòng đời
--   madh            SERIAL              PK
--   makh            INT                 FK → khachhang(makh)
--   ngaytao         TIMESTAMPTZ         DEFAULT NOW()
--   trangthai       trang_thai_don_hang DEFAULT 'BAO_GIA_NHAP'
--   tonggiatri      NUMERIC(15,2)       DEFAULT 0

-- Bảng 9: chitietdh — BOM (Bill of Materials)
--   mactdh          SERIAL          PK
--   madh            INT             FK → donhang(madh) CASCADE
--   mavt            INT             FK → vattu(mavt)
--   mota            VARCHAR(200)
--   chieudaicat     INT             (mm)
--   soluong         INT             DEFAULT 1
--   dongiadongbang  NUMERIC(15,2)   (Price Freeze)
--   thanhtien       NUMERIC(15,2)

-- Bảng 10: phancong — Giao việc Admin → Thợ
--   mapc        SERIAL              PK
--   madh        INT                 FK → donhang(madh) CASCADE
--   matho       INT                 FK → nguoidung(mand)
--   trangthai   trang_thai_phan_cong DEFAULT 'CHO_THUC_HIEN'

-- Bảng 11: sodocat — Sơ đồ cắt trên thanh phôi
--   masdc       SERIAL              PK
--   mapc        INT                 FK → phancong(mapc) CASCADE
--   maphoi      INT                 FK → khothanhphoi(maphoi)
--   trangthai   trang_thai_so_do_cat DEFAULT 'CHO_DUYET'

-- Bảng 12: chitietcat — Chi tiết từng nhát cắt
--   mactc           SERIAL                  PK
--   masdc           INT                     FK → sodocat(masdc) CASCADE
--   mactdh          INT                     FK → chitietdh(mactdh) SET NULL
--   thutucat        INT                     DEFAULT 1
--   chieudaicat     INT                     NOT NULL (mm)
--   trangthai       trang_thai_chi_tiet_cat DEFAULT 'CHO_CAT'

-- Bảng 13: nhatkygiacong — Nhật ký gia công (audit trail)
--   mank            SERIAL          PK
--   maphoi          INT             FK → khothanhphoi(maphoi)
--   mapc            INT             FK → phancong(mapc) SET NULL
--   matho           INT             FK → nguoidung(mand) SET NULL
--   sukien          loai_su_kien    NOT NULL
--   chieudaitruoc   INT             NOT NULL (mm)
--   chieudaisau     INT             NOT NULL (mm)
--   ghichu          TEXT
--   thoigian        TIMESTAMPTZ     DEFAULT NOW()

-- Bảng 14: giaodich — Dòng tiền thu/chi
--   magd        SERIAL                  PK
--   madh        INT                     FK → donhang(madh)
--   loaigd      loai_giao_dich          NOT NULL
--   phuongthuc  phuong_thuc_thanh_toan  NOT NULL
--   sotien      NUMERIC(15,2)           NOT NULL
--   ngaygd      TIMESTAMPTZ             DEFAULT NOW()
--   ghichu      TEXT

-- Bảng 15: hinhanh — Ảnh khảo sát/nghiệm thu
--   maha        SERIAL          PK
--   madh        INT             FK → donhang(madh) CASCADE
--   duongdan    VARCHAR(500)    NOT NULL (URL)
--   nguoichup   INT             FK → nguoidung(mand) SET NULL
--   mota        VARCHAR(255)
--   thoigian    TIMESTAMPTZ     DEFAULT NOW()

-- =====================
-- INDEXES (18)
-- =====================
-- idx_vattu_danhmuc, idx_vattu_tenvt,
-- idx_khophoi_vattu, idx_khophoi_lonhap, idx_khophoi_trangthai,
-- idx_donhang_khach, idx_donhang_trangthai,
-- idx_chitietdh_don, idx_chitietdh_vattu,
-- idx_phancong_don, idx_phancong_tho,
-- idx_sodocat_phancong, idx_sodocat_phoi,
-- idx_chitietcat_sodo,
-- idx_nhatky_phoi, idx_nhatky_tho,
-- idx_giaodich_don, idx_hinhanh_don

-- =====================
-- RLS: Enabled trên tất cả 15 bảng
-- Policy: authenticated users có full access
-- Service Role key bypass RLS tự động
-- =====================
