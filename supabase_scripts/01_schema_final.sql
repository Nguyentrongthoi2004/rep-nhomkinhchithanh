-- =====================================================
-- SCRIPT 01: SCHEMA HOÀN CHỈNH MINI-ERP NHÔM KÍNH
-- PostgreSQL / Supabase
-- 15 Bảng · 11 ENUM Types · 17 Indexes · RLS Policies
-- =====================================================
-- NAMING CONVENTION: lowercase, KHÔNG DẤU GẠCH DƯỚI
-- (khớp 100% với code Frontend đã viết)
-- =====================================================

-- =====================
-- BƯỚC 1: TẠO ENUM TYPES
-- =====================

CREATE TYPE trang_thai_danh_muc     AS ENUM ('HOAT_DONG', 'NGUNG');
CREATE TYPE trang_thai_phoi         AS ENUM ('MOI', 'CON_DU', 'BO_DI');
CREATE TYPE trang_thai_don_hang     AS ENUM ('BAO_GIA_NHAP', 'KHAO_SAT', 'DA_COC', 'DANG_GIA_CONG', 'DANG_LAP_DAT', 'HOAN_THANH', 'DA_HUY');
CREATE TYPE vai_tro_nguoi_dung      AS ENUM ('ADMIN', 'WORKER');
CREATE TYPE trang_thai_nguoi_dung   AS ENUM ('DANG_LAM', 'NGHI_VIEC');
CREATE TYPE trang_thai_phan_cong    AS ENUM ('CHO_THUC_HIEN', 'DANG_THUC_HIEN', 'HOAN_THANH');
CREATE TYPE trang_thai_so_do_cat    AS ENUM ('CHO_DUYET', 'DANG_CAT', 'HOAN_THANH');
CREATE TYPE trang_thai_chi_tiet_cat AS ENUM ('CHO_CAT', 'DA_CAT', 'LOI');
CREATE TYPE loai_su_kien            AS ENUM ('CAT', 'LOI', 'BO_DI');
CREATE TYPE loai_giao_dich          AS ENUM ('DAT_COC', 'TAM_UNG', 'HOAN_TAT', 'HUY_DON');
CREATE TYPE phuong_thuc_thanh_toan  AS ENUM ('TIEN_MAT', 'CHUYEN_KHOAN');

-- Bổ sung: trạng thái yêu cầu cấp quyền
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_yeu_cau') THEN
    CREATE TYPE trang_thai_yeu_cau AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- =====================
-- BƯỚC 2: TẠO 15 BẢNG
-- =====================

-- ─── Bảng 1: quytac ────────────────────────────────────────────
-- Hằng số vật lý sản xuất (KERF, SAFE_MARGIN, độ hở cánh...)
CREATE TABLE quytac (
    maqt        VARCHAR(50)     PRIMARY KEY,
    tenqt       VARCHAR(100)    NOT NULL,
    giatri      NUMERIC(10,2)   NOT NULL
);

-- ─── Bảng 2: danhmuc ───────────────────────────────────────────
-- Nhóm vật tư: Nhôm, Kính, Phụ Kiện, Vật Tư Phụ, Nhân Công
CREATE TABLE danhmuc (
    madm        SERIAL          PRIMARY KEY,
    tendm       VARCHAR(100)    NOT NULL UNIQUE,
    mota        VARCHAR(255),
    trangthai   trang_thai_danh_muc NOT NULL DEFAULT 'HOAT_DONG',
    ngaytao     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── Bảng 3: nguoidung ─────────────────────────────────────────
-- Tài khoản Admin và Worker (khai báo sớm vì nhiều bảng cần FK)
CREATE TABLE nguoidung (
    mand            SERIAL          PRIMARY KEY,
    tendangnhap     VARCHAR(50)     NOT NULL UNIQUE,
    hoten           VARCHAR(100)    NOT NULL,
    vaitro          vai_tro_nguoi_dung NOT NULL,
    sdt             VARCHAR(15),
    trangthai       trang_thai_nguoi_dung NOT NULL DEFAULT 'DANG_LAM'
);

-- ─── Bảng 3b: yeucaucapquyen ────────────────────────────────────
-- Yêu cầu cấp quyền tài khoản (để admin duyệt)
CREATE TABLE IF NOT EXISTS yeucaucapquyen (
  mayc        SERIAL PRIMARY KEY,
  hoten       VARCHAR(100) NOT NULL,
  sdt         VARCHAR(15),
  tendangnhap VARCHAR(80) NOT NULL,
  vaitro      vai_tro_nguoi_dung NOT NULL DEFAULT 'WORKER',
  ghichu      TEXT,
  trangthai   trang_thai_yeu_cau NOT NULL DEFAULT 'PENDING',
  ngaytao     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ngayduyet   TIMESTAMPTZ,
  nguoiduyet  INT REFERENCES nguoidung(mand) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_yeucau_trangthai ON yeucaucapquyen(trangthai);
CREATE INDEX IF NOT EXISTS idx_yeucau_tendangnhap ON yeucaucapquyen(tendangnhap);

-- ─── Bảng 4: khachhang ─────────────────────────────────────────
-- Hồ sơ khách hàng, tra cứu nhanh qua Số Điện Thoại
CREATE TABLE khachhang (
    makh        SERIAL          PRIMARY KEY,
    hoten       VARCHAR(100)    NOT NULL,
    sdt         VARCHAR(15)     NOT NULL UNIQUE,
    diachi      VARCHAR(255)
);

-- ─── Bảng 5: vattu ─────────────────────────────────────────────
-- Master data vật tư: nhôm, kính, phụ kiện, vật tư phụ, nhân công
CREATE TABLE vattu (
    mavt                SERIAL          PRIMARY KEY,
    madm                INT             NOT NULL REFERENCES danhmuc(madm) ON DELETE RESTRICT,
    tenvt               VARCHAR(150)    NOT NULL,
    donvitinh           VARCHAR(20)     NOT NULL,
    chieudaimacdinh     INT,            -- mm, chỉ cho nhôm thanh; NULL nếu kính/phụ kiện
    dongianhap          NUMERIC(15,2)   NOT NULL,
    dongiaban           NUMERIC(15,2)
);

-- ─── Bảng 6: lonhap ────────────────────────────────────────────
-- Đợt nhập kho, phân biệt nguồn gốc từng thanh phôi
CREATE TABLE lonhap (
    malonhap    SERIAL          PRIMARY KEY,
    ngaynhap    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    nhacungcap  VARCHAR(150)
);

-- ─── Bảng 7: khothanhphoi ──────────────────────────────────────
-- Mỗi thanh nhôm vật lý = 1 bản ghi (Immutable Identity)
CREATE TABLE khothanhphoi (
    maphoi              SERIAL          PRIMARY KEY,
    mavt                INT             NOT NULL REFERENCES vattu(mavt) ON DELETE RESTRICT,
    malonhap            INT             NOT NULL REFERENCES lonhap(malonhap) ON DELETE RESTRICT,
    chieudaibandau      INT             NOT NULL,   -- mm, lúc nhập kho
    chieudaihientai     INT             NOT NULL,   -- mm, cập nhật sau mỗi lần cắt
    trangthai           trang_thai_phoi NOT NULL DEFAULT 'MOI',
    CONSTRAINT chk_chieudai CHECK (chieudaihientai >= 0 AND chieudaibandau > 0)
);

-- ─── Bảng 8: donhang ───────────────────────────────────────────
-- Vòng đời đơn hàng + cơ chế Price Freeze
CREATE TABLE donhang (
    madh            SERIAL              PRIMARY KEY,
    makh            INT                 NOT NULL REFERENCES khachhang(makh) ON DELETE RESTRICT,
    ngaytao         TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    trangthai       trang_thai_don_hang NOT NULL DEFAULT 'BAO_GIA_NHAP',
    tonggiatri      NUMERIC(15,2)       DEFAULT 0
);

-- ─── Bảng 9: chitietdh (BOM - Bill of Materials) ───────────────
-- Bóc tách từng linh kiện cần cắt/mua trong đơn
CREATE TABLE chitietdh (
    mactdh          SERIAL          PRIMARY KEY,
    madh            INT             NOT NULL REFERENCES donhang(madh) ON DELETE CASCADE,
    mavt            INT             NOT NULL REFERENCES vattu(mavt) ON DELETE RESTRICT,
    mota            VARCHAR(200),                  -- Tên linh kiện ("Cột đứng", "Xà ngang")
    chieudaicat     INT,                           -- mm, NULL nếu kính/phụ kiện
    soluong         INT             NOT NULL DEFAULT 1,
    dongiadongbang  NUMERIC(15,2),                 -- Price Freeze: chốt giá khi DA_COC
    thanhtien       NUMERIC(15,2)
);

-- ─── Bảng 10: phancong ─────────────────────────────────────────
-- Giao việc Admin → Thợ cho từng đơn hàng
CREATE TABLE phancong (
    mapc        SERIAL              PRIMARY KEY,
    madh        INT                 NOT NULL REFERENCES donhang(madh) ON DELETE CASCADE,
    matho       INT                 NOT NULL REFERENCES nguoidung(mand) ON DELETE RESTRICT,
    trangthai   trang_thai_phan_cong NOT NULL DEFAULT 'CHO_THUC_HIEN'
);

-- ─── Bảng 11: sodocat ──────────────────────────────────────────
-- Phương án cắt trên từng thanh phôi cụ thể
CREATE TABLE sodocat (
    masdc       SERIAL              PRIMARY KEY,
    mapc        INT                 NOT NULL REFERENCES phancong(mapc) ON DELETE CASCADE,
    maphoi      INT                 NOT NULL REFERENCES khothanhphoi(maphoi) ON DELETE RESTRICT,
    trangthai   trang_thai_so_do_cat NOT NULL DEFAULT 'CHO_DUYET'
);

-- ─── Bảng 12: chitietcat ───────────────────────────────────────
-- Từng nhát cắt cụ thể trên 1 sơ đồ cắt
CREATE TABLE chitietcat (
    mactc           SERIAL                  PRIMARY KEY,
    masdc           INT                     NOT NULL REFERENCES sodocat(masdc) ON DELETE CASCADE,
    mactdh          INT                     REFERENCES chitietdh(mactdh) ON DELETE SET NULL,
    thutucat        INT                     NOT NULL DEFAULT 1,
    chieudaicat     INT                     NOT NULL,   -- mm
    trangthai       trang_thai_chi_tiet_cat NOT NULL DEFAULT 'CHO_CAT'
);

-- ─── Bảng 13: nhatkygiacong ────────────────────────────────────
-- Lịch sử hoàn chỉnh mọi thao tác cắt (audit trail)
CREATE TABLE nhatkygiacong (
    mank            SERIAL          PRIMARY KEY,
    maphoi          INT             NOT NULL REFERENCES khothanhphoi(maphoi) ON DELETE RESTRICT,
    mapc            INT             REFERENCES phancong(mapc) ON DELETE SET NULL,
    matho           INT             REFERENCES nguoidung(mand) ON DELETE SET NULL,
    sukien          loai_su_kien    NOT NULL,       -- CAT | LOI | BO_DI
    chieudaitruoc   INT             NOT NULL,       -- mm trước khi cắt
    chieudaisau     INT             NOT NULL,       -- mm sau khi cắt
    ghichu          TEXT,                           -- lý do lỗi (nếu có)
    thoigian        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── Bảng 14: giaodich ─────────────────────────────────────────
-- Dòng tiền thu/chi, nguồn duy nhất tính công nợ
CREATE TABLE giaodich (
    magd        SERIAL                  PRIMARY KEY,
    madh        INT                     NOT NULL REFERENCES donhang(madh) ON DELETE RESTRICT,
    loaigd      loai_giao_dich          NOT NULL,   -- DAT_COC | TAM_UNG | HOAN_TAT | HUY_DON
    phuongthuc  phuong_thuc_thanh_toan  NOT NULL,   -- TIEN_MAT | CHUYEN_KHOAN
    sotien      NUMERIC(15,2)           NOT NULL,
    ngaygd      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    ghichu      TEXT
);

-- ─── Bảng 15: hinhanh ──────────────────────────────────────────
-- Ảnh khảo sát, nghiệm thu, sự cố (lưu URL Supabase Storage)
CREATE TABLE hinhanh (
    maha        SERIAL          PRIMARY KEY,
    madh        INT             NOT NULL REFERENCES donhang(madh) ON DELETE CASCADE,
    duongdan    VARCHAR(500)    NOT NULL,   -- URL ảnh
    nguoichup   INT             REFERENCES nguoidung(mand) ON DELETE SET NULL,
    mota        VARCHAR(255),
    thoigian    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- =====================
-- BƯỚC 3: INDEXES (17 indexes)
-- =====================

CREATE INDEX idx_vattu_danhmuc         ON vattu(madm);
CREATE INDEX idx_vattu_tenvt           ON vattu(tenvt);
CREATE INDEX idx_khophoi_vattu         ON khothanhphoi(mavt);
CREATE INDEX idx_khophoi_lonhap        ON khothanhphoi(malonhap);
CREATE INDEX idx_khophoi_trangthai     ON khothanhphoi(trangthai);
CREATE INDEX idx_donhang_khach         ON donhang(makh);
CREATE INDEX idx_donhang_trangthai     ON donhang(trangthai);
CREATE INDEX idx_chitietdh_don         ON chitietdh(madh);
CREATE INDEX idx_chitietdh_vattu       ON chitietdh(mavt);
CREATE INDEX idx_phancong_don          ON phancong(madh);
CREATE INDEX idx_phancong_tho          ON phancong(matho);
CREATE INDEX idx_sodocat_phancong      ON sodocat(mapc);
CREATE INDEX idx_sodocat_phoi          ON sodocat(maphoi);
CREATE INDEX idx_chitietcat_sodo       ON chitietcat(masdc);
CREATE INDEX idx_nhatky_phoi           ON nhatkygiacong(maphoi);
CREATE INDEX idx_nhatky_tho            ON nhatkygiacong(matho);
CREATE INDEX idx_giaodich_don          ON giaodich(madh);
CREATE INDEX idx_hinhanh_don           ON hinhanh(madh);


-- =====================
-- BƯỚC 4: ROW LEVEL SECURITY (RLS)
-- =====================
-- Bật RLS trên TẤT CẢ bảng.
-- Policy: Cho phép authenticated users thao tác đầy đủ.
-- Phân quyền chi tiết ADMIN/WORKER xử lý ở tầng API (Next.js).
-- Service Role key tự động bypass RLS.
-- =====================

ALTER TABLE quytac          ENABLE ROW LEVEL SECURITY;
ALTER TABLE danhmuc         ENABLE ROW LEVEL SECURITY;
ALTER TABLE nguoidung       ENABLE ROW LEVEL SECURITY;
ALTER TABLE khachhang       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vattu           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lonhap          ENABLE ROW LEVEL SECURITY;
ALTER TABLE khothanhphoi    ENABLE ROW LEVEL SECURITY;
ALTER TABLE donhang         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chitietdh       ENABLE ROW LEVEL SECURITY;
ALTER TABLE phancong        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sodocat         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chitietcat      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhatkygiacong   ENABLE ROW LEVEL SECURITY;
ALTER TABLE giaodich        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hinhanh         ENABLE ROW LEVEL SECURITY;

-- Policy cho authenticated users (đọc/ghi tất cả)
CREATE POLICY "Authenticated full access" ON quytac        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON danhmuc       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON nguoidung     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON khachhang     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vattu         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON lonhap        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON khothanhphoi  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON donhang       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON chitietdh     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON phancong      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON sodocat       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON chitietcat    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON nhatkygiacong FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON giaodich      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON hinhanh       FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =====================================================
-- HOÀN TẤT SCHEMA
-- Tổng: 15 bảng · 11 ENUM types · 18 indexes · 15 RLS policies
-- Naming: lowercase, không dấu gạch dưới
-- =====================================================
