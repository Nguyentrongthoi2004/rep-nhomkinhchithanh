-- Đợt 5: bổ sung metadata ảnh để worker chụp xác nhận cắt phôi và hoàn thành công trình.
-- Không sửa schema gốc; các cột đều nullable để tương thích ảnh cũ chỉ có madh/duongdan.
ALTER TABLE hinhanh
  ADD COLUMN IF NOT EXISTS loaianh TEXT NOT NULL DEFAULT 'KHAC',
  ADD COLUMN IF NOT EXISTS mapc INT REFERENCES phancong(mapc) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS masdc INT REFERENCES sodocat(masdc) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS maphoi INT REFERENCES khothanhphoi(maphoi) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hinhanh_loaianh ON hinhanh(loaianh);
CREATE INDEX IF NOT EXISTS idx_hinhanh_phancong ON hinhanh(mapc);
CREATE INDEX IF NOT EXISTS idx_hinhanh_sodocat ON hinhanh(masdc);
CREATE INDEX IF NOT EXISTS idx_hinhanh_phoi ON hinhanh(maphoi);

ALTER TABLE hinhanh
  DROP CONSTRAINT IF EXISTS chk_hinhanh_loaianh;

ALTER TABLE hinhanh
  ADD CONSTRAINT chk_hinhanh_loaianh
  CHECK (loaianh IN ('CAT_PHOI', 'HOAN_THANH_CONG_TRINH', 'BAO_CAO_SU_CO', 'KHAC'));
