-- =====================================================
-- SCRIPT 04: YÊU CẦU CẤP QUYỀN TÀI KHOẢN (ACCESS REQUESTS)
-- PostgreSQL / Supabase
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_yeu_cau') THEN
    CREATE TYPE trang_thai_yeu_cau AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS yeucaucapquyen (
  mayc        SERIAL PRIMARY KEY,
  hoten       VARCHAR(100) NOT NULL,
  sdt         VARCHAR(15),
  tendangnhap VARCHAR(80) NOT NULL,
  vaitro      vai_tro_nguoi_dung NOT NULL DEFAULT 'WORKER',
  ghichu      TEXT,
  trangthai   trang_thai_yeu_cau NOT NULL DEFAULT 'PENDING',
  createdat   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decidedat   TIMESTAMPTZ,
  decidedby   INT REFERENCES nguoidung(mand) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_yeucau_trangthai ON yeucaucapquyen(trangthai);
CREATE INDEX IF NOT EXISTS idx_yeucau_tendangnhap ON yeucaucapquyen(tendangnhap);

ALTER TABLE yeucaucapquyen ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='yeucaucapquyen' AND policyname='Authenticated full access'
  ) THEN
    CREATE POLICY "Authenticated full access" ON yeucaucapquyen FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

