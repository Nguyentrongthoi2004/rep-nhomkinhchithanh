-- =====================================================
-- SCRIPT 09: WORKER TU CHOI NHIEM VU + GHI NHAN SU CO
-- =====================================================
-- Muc tieu:
-- - Them trang thai TU_CHOI cho phancong theo cach an toan voi PostgreSQL enum.
-- - Luu ly do tu choi tren phancong de Admin xem va phan cong lai.
-- - Khong drop enum, khong recreate enum, khong mat du lieu cu.

ALTER TYPE trang_thai_phan_cong ADD VALUE IF NOT EXISTS 'TU_CHOI';

ALTER TABLE phancong
  ADD COLUMN IF NOT EXISTS lydotuchoi TEXT,
  ADD COLUMN IF NOT EXISTS tuchoiluc TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_phancong_trangthai ON phancong(trangthai);

NOTIFY pgrst, 'reload schema';
