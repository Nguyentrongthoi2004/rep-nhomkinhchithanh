-- =====================================================
-- SCRIPT 05: THÔNG BÁO (ĐÃ ĐỌC) + ĐỒNG BỘ TÊN CỘT YÊU CẦU CẤP QUYỀN
-- =====================================================
-- Mục tiêu:
-- 1) Lưu trạng thái "đã đọc thông báo tới thời điểm" theo từng user (ADMIN)
-- 2) Đổi tên 3 cột English trong yeucaucapquyen để đồng bộ naming tiếng Việt không dấu
-- =====================================================

-- 1) Bảng trạng thái đã đọc thông báo
CREATE TABLE IF NOT EXISTS thongbaodadoc (
  mand      INT PRIMARY KEY REFERENCES nguoidung(mand) ON DELETE CASCADE,
  dadoctoi  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE thongbaodadoc ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'thongbaodadoc'
      AND policyname = 'authenticated_full_access_thongbaodadoc'
  ) THEN
    CREATE POLICY authenticated_full_access_thongbaodadoc ON thongbaodadoc
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2) Đổi tên cột yeucaucapquyen (nếu đang dùng createdat/decidedat/decidedby)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'yeucaucapquyen' AND column_name = 'createdat'
  ) THEN
    ALTER TABLE yeucaucapquyen RENAME COLUMN createdat TO ngaytao;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'yeucaucapquyen' AND column_name = 'decidedat'
  ) THEN
    ALTER TABLE yeucaucapquyen RENAME COLUMN decidedat TO ngayduyet;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'yeucaucapquyen' AND column_name = 'decidedby'
  ) THEN
    ALTER TABLE yeucaucapquyen RENAME COLUMN decidedby TO nguoiduyet;
  END IF;
END $$;

-- Index lại theo cột mới (an toàn: tạo IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_yeucau_ngaytao ON yeucaucapquyen(ngaytao);

