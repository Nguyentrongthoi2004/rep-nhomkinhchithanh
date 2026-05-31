-- DEPRECATED / DO NOT RUN
-- Migration 14 là bản nháp proposal cũ.
-- Không chạy file này nữa.
-- Migration 15 đã thay thế hoàn toàn và tự tạo/patch dexuatcat, chitietdexuatcat, RPC approve/reject.
-- Migration 14: Bổ sung Quy tắc & Bảng Đề xuất cắt (Chuyên đề 2)

-- 1. Bổ sung các quy tắc còn thiếu vào bảng quytac
INSERT INTO quytac (maqt, tenqt, giatri)
VALUES
  ('BLADE_KERF', 'Độ hao hụt lưỡi cưa mỗi nhát cắt (mm)', 5.00),
  ('MIN_SCRAP', 'Ngưỡng phế liệu - dưới mức này coi là vứt bỏ (mm)', 100.00),
  ('MIN_REUSABLE_LENGTH', 'Ngưỡng tái sử dụng phôi dư (mm)', 1500.00)
ON CONFLICT (maqt) DO UPDATE
SET tenqt = EXCLUDED.tenqt, giatri = EXCLUDED.giatri;

-- 2. Tạo ENUM trang_thai_de_xuat
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_de_xuat') THEN
        CREATE TYPE trang_thai_de_xuat AS ENUM ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'HET_HIEU_LUC');
    END IF;
END$$;

-- 3. Tạo bảng dexuatcat
CREATE TABLE IF NOT EXISTS dexuatcat (
    madxc SERIAL PRIMARY KEY,
    mapc INT NOT NULL REFERENCES phancong(mapc) ON DELETE CASCADE,
    matho INT NOT NULL REFERENCES nguoidung(mand) ON DELETE RESTRICT,
    trangthai trang_thai_de_xuat NOT NULL DEFAULT 'CHO_DUYET',
    lydodexuat TEXT,
    admin_ghichu TEXT,
    tonghaohut_cu NUMERIC(10,2),
    tonghaohut_moi NUMERIC(10,2),
    tiletandung_cu NUMERIC(5,2),
    tiletandung_moi NUMERIC(5,2),
    phandutaisudung_cu INT DEFAULT 0,
    phandutaisudung_moi INT DEFAULT 0,
    phanduphelieu_cu INT DEFAULT 0,
    phanduphelieu_moi INT DEFAULT 0,
    score_cu NUMERIC(10,2),
    score_moi NUMERIC(10,2),
    ngaytao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ngayduyet TIMESTAMPTZ,
    nguoiduyet INT REFERENCES nguoidung(mand) ON DELETE SET NULL
);

-- 4. Tạo bảng chitietdexuatcat
CREATE TABLE IF NOT EXISTS chitietdexuatcat (
    mactdxc SERIAL PRIMARY KEY,
    madxc INT NOT NULL REFERENCES dexuatcat(madxc) ON DELETE CASCADE,
    maphoi INT NOT NULL REFERENCES khothanhphoi(maphoi) ON DELETE RESTRICT,
    mactdh INT REFERENCES chitietdh(mactdh) ON DELETE SET NULL,
    chieudaicat INT NOT NULL,
    thutucat INT NOT NULL DEFAULT 1,
    kerf_mm INT NOT NULL DEFAULT 5,
    chieudaiphoi_truoccat INT NOT NULL,
    phandu_saucat INT NOT NULL,
    loai_phandu VARCHAR(20) NOT NULL DEFAULT 'PHE_LIEU' CHECK (loai_phandu IN ('TAI_SU_DUNG','PHE_LIEU','LO_CO')),
    score NUMERIC(10,2),
    lydochon TEXT
);

-- 5. Tạo Indexes
CREATE INDEX IF NOT EXISTS idx_dexuatcat_mapc ON dexuatcat(mapc);
CREATE INDEX IF NOT EXISTS idx_dexuatcat_trangthai ON dexuatcat(trangthai);
CREATE INDEX IF NOT EXISTS idx_chitietdexuatcat_madxc ON chitietdexuatcat(madxc);
