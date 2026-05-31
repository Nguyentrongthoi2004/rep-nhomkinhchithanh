-- =====================================================
-- SCRIPT 08: TAO BANG THONG BAO THAT
-- =====================================================
-- Muc tieu:
-- - Bo sung bang thongbao neu database hien tai chua co.
-- - Khong sua 01_schema_final.sql, khong drop/recreate bang cu.
-- - Dung cho dropdown notification that: doc, xoa, xoa da doc.

CREATE TABLE IF NOT EXISTS thongbao (
  matb    SERIAL PRIMARY KEY,
  mand    INT NOT NULL REFERENCES nguoidung(mand) ON DELETE CASCADE,
  tieude  VARCHAR(200),
  noidung TEXT NOT NULL,
  daxem   BOOLEAN NOT NULL DEFAULT FALSE,
  ngaytao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dulieu  JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_thongbao_mand ON thongbao(mand);
CREATE INDEX IF NOT EXISTS idx_thongbao_daxem ON thongbao(daxem);
CREATE INDEX IF NOT EXISTS idx_thongbao_ngaytao ON thongbao(ngaytao);

ALTER TABLE thongbao ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'thongbao'
      AND policyname = 'authenticated_full_access_thongbao'
  ) THEN
    CREATE POLICY authenticated_full_access_thongbao ON thongbao
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Backfill nhe de cac don test da tao truoc migration cung hien trong chuong.
INSERT INTO thongbao (mand, tieude, noidung, daxem, ngaytao, dulieu)
SELECT
  nd.mand,
  'Đơn hàng DH-' || dh.madh || ' đã có trong hệ thống',
  COALESCE(kh.hoten, 'Khách hàng') || ' - trạng thái ' || dh.trangthai,
  FALSE,
  COALESCE(dh.ngaytao, NOW()),
  jsonb_build_object(
    'loai', 'don_hang',
    'href', '/admin/don-hang/' || dh.madh,
    'doi_tuong', 'donhang',
    'ma_doi_tuong', dh.madh,
    'seed', 'existing_order'
  )
FROM nguoidung nd
CROSS JOIN donhang dh
LEFT JOIN khachhang kh ON kh.makh = dh.makh
WHERE nd.vaitro = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1
    FROM thongbao tb
    WHERE tb.mand = nd.mand
      AND tb.dulieu @> jsonb_build_object(
        'doi_tuong', 'donhang',
        'ma_doi_tuong', dh.madh,
        'seed', 'existing_order'
      )
  );
