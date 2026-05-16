-- =====================================================
-- SCRIPT 10: WORKFLOW XU LY SU CO PHOI
-- =====================================================
-- Muc tieu:
-- - Moi su co cat hong co trang thai xu ly rieng de tranh spam/rac UI.
-- - Luu masdc lien quan neu su co den tu so do cat.
-- - Admin co the bo phoi hoac cat bo doan loi roi tiep tuc tai su dung.

ALTER TABLE nhatkygiacong
  ADD COLUMN IF NOT EXISTS masdc INT REFERENCES sodocat(masdc) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trangthaixuly TEXT NOT NULL DEFAULT 'CHO_XU_LY',
  ADD COLUMN IF NOT EXISTS huongxuly TEXT,
  ADD COLUMN IF NOT EXISTS xulyluc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nguoixuly INT REFERENCES nguoidung(mand) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nhatkygiacong_trangthaixuly_check'
  ) THEN
    ALTER TABLE nhatkygiacong
      ADD CONSTRAINT nhatkygiacong_trangthaixuly_check
      CHECK (trangthaixuly IN ('CHO_XU_LY', 'DA_XU_LY'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nhatky_su_co_xuly
  ON nhatkygiacong(sukien, trangthaixuly, maphoi, mapc, masdc);

NOTIFY pgrst, 'reload schema';
