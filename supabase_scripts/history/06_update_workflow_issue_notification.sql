-- =====================================================
-- SCRIPT 06: CAP NHAT WORKFLOW DUYET GIA / SU CO / THONG BAO
-- =====================================================
-- Dot 1 su dung: them trang thai don hang DA_DUYET_GIA.
-- Cac phan sau se bo sung tiep trong cung migration nay hoac migration moi,
-- tuy vao pham vi tung dot.
-- =====================================================

ALTER TYPE trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DA_DUYET_GIA';
ALTER TYPE trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DA_THANH_TOAN';
