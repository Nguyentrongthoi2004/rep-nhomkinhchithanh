-- =====================================================
-- MIGRATION 15: CUTTING PROPOSAL + APPROVE/REJECT RPC
-- =====================================================
-- Muc tieu:
-- - Tao nen chinh thuc cho Dot 4: Worker gui de xuat cat, Admin duyet/tu choi.
-- - Tu tuong an toan: Worker chi tao proposal, khong sua so do cat chinh thuc.
-- - Chi khi Admin approve thi so do cat chinh thuc moi duoc hard replace.
-- - Hard replace chi an toan khi nam trong RPC/transaction PostgreSQL: loi ky thuat thi rollback toan bo.
-- - Loi nghiep vu/stale du doan duoc thi KHONG RAISE; update HET_HIEU_LUC va return EXPIRED de luu audit.
-- - Snapshot o Dot 4 chi dung de audit/giai thich. Approve dua tren revalidate du lieu hien tai.
--
-- File nay tu xu ly duoc ca 2 truong hop:
-- - DB da chay migration 14.
-- - DB chua chay migration 14.
--
-- CHUA apply neu chua review xong.

-- -----------------------------------------------------
-- 1. Bao dam cac rule san xuat ton tai, khong ghi de cau hinh hien co.
-- -----------------------------------------------------
INSERT INTO quytac (maqt, tenqt, giatri)
VALUES
  ('BLADE_KERF', 'Do hao hut luoi cua moi nhat cat (mm)', 5.00),
  ('SAFE_MARGIN', 'Bien kep may an toan moi dau phoi (mm)', 20.00),
  ('MIN_SCRAP', 'Nguong phe lieu - duoi muc nay coi la bo (mm)', 100.00),
  ('MIN_REUSABLE_LENGTH', 'Nguong tai su dung phoi du (mm)', 1500.00)
ON CONFLICT (maqt) DO NOTHING;

-- -----------------------------------------------------
-- 2. Bao dam enum trang_thai_de_xuat ton tai.
-- Khong dung ALTER TYPE ... ADD VALUE IF NOT EXISTS de tranh loi khac version PostgreSQL.
-- -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_de_xuat') THEN
    CREATE TYPE trang_thai_de_xuat AS ENUM ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'HET_HIEU_LUC');
  END IF;
END $$;

DO $$
DECLARE
  v_label TEXT;
BEGIN
  FOREACH v_label IN ARRAY ARRAY['CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'HET_HIEU_LUC']
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'trang_thai_de_xuat'
        AND e.enumlabel = v_label
    ) THEN
      EXECUTE format('ALTER TYPE trang_thai_de_xuat ADD VALUE %L', v_label);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------
-- 3. Bao dam cot xu ly su co co san de RPC chan phoi/sdc dang co loi mo.
-- Neu migration 10 da chay thi cac lenh nay khong lam thay doi gi.
-- -----------------------------------------------------
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
      AND conrelid = 'nhatkygiacong'::regclass
  ) THEN
    ALTER TABLE nhatkygiacong
      ADD CONSTRAINT nhatkygiacong_trangthaixuly_check
      CHECK (trangthaixuly IN ('CHO_XU_LY', 'DA_XU_LY'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nhatky_su_co_xuly
  ON nhatkygiacong(sukien, trangthaixuly, maphoi, mapc, masdc);

-- -----------------------------------------------------
-- 4. Bang dexuatcat: header proposal.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS dexuatcat (
  madxc SERIAL PRIMARY KEY,
  mapc INT NOT NULL REFERENCES phancong(mapc) ON DELETE CASCADE,
  matho INT NOT NULL REFERENCES nguoidung(mand) ON DELETE RESTRICT,
  trangthai trang_thai_de_xuat NOT NULL DEFAULT 'CHO_DUYET',
  lydodexuat TEXT,
  admin_ghichu TEXT,
  score_cu NUMERIC(10,2),
  score_moi NUMERIC(10,2),
  tonghaohut_cu NUMERIC(10,2),
  tonghaohut_moi NUMERIC(10,2),
  tiletandung_cu NUMERIC(5,2),
  tiletandung_moi NUMERIC(5,2),
  phandutaisudung_cu INT DEFAULT 0,
  phandutaisudung_moi INT DEFAULT 0,
  phanduphelieu_cu INT DEFAULT 0,
  phanduphelieu_moi INT DEFAULT 0,
  metrics_cu JSONB,
  metrics_moi JSONB,
  snapshot_bom JSONB,
  snapshot_phoi JSONB,
  snapshot_rules JSONB,
  warnings JSONB,
  selected_reasons JSONB,
  ngaytao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ngayduyet TIMESTAMPTZ,
  nguoiduyet INT REFERENCES nguoidung(mand) ON DELETE SET NULL
);

ALTER TABLE dexuatcat
  ADD COLUMN IF NOT EXISTS lydodexuat TEXT,
  ADD COLUMN IF NOT EXISTS admin_ghichu TEXT,
  ADD COLUMN IF NOT EXISTS score_cu NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS score_moi NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tonghaohut_cu NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tonghaohut_moi NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tiletandung_cu NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS tiletandung_moi NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS phandutaisudung_cu INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phandutaisudung_moi INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phanduphelieu_cu INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phanduphelieu_moi INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metrics_cu JSONB,
  ADD COLUMN IF NOT EXISTS metrics_moi JSONB,
  ADD COLUMN IF NOT EXISTS snapshot_bom JSONB,
  ADD COLUMN IF NOT EXISTS snapshot_phoi JSONB,
  ADD COLUMN IF NOT EXISTS snapshot_rules JSONB,
  ADD COLUMN IF NOT EXISTS warnings JSONB,
  ADD COLUMN IF NOT EXISTS selected_reasons JSONB,
  ADD COLUMN IF NOT EXISTS ngayduyet TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nguoiduyet INT REFERENCES nguoidung(mand) ON DELETE SET NULL;

-- -----------------------------------------------------
-- 5. Bang chitietdexuatcat: chi tiet tung nhat cat de phuc dung phuong an.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS chitietdexuatcat (
  mactdxc SERIAL PRIMARY KEY,
  madxc INT NOT NULL REFERENCES dexuatcat(madxc) ON DELETE CASCADE,
  maphoi INT NOT NULL REFERENCES khothanhphoi(maphoi) ON DELETE RESTRICT,
  mactdh INT NOT NULL REFERENCES chitietdh(mactdh) ON DELETE RESTRICT,
  chieudaicat INT NOT NULL,
  thutucat INT NOT NULL DEFAULT 1,
  kerf_mm NUMERIC(10,2) NOT NULL DEFAULT 5,
  chieudaiphoi_truoccat INT NOT NULL,
  phandu_saucat INT NOT NULL,
  loai_phandu TEXT NOT NULL DEFAULT 'PHE_LIEU',
  score NUMERIC(10,2),
  lydochon TEXT
);

ALTER TABLE chitietdexuatcat
  ADD COLUMN IF NOT EXISTS kerf_mm NUMERIC(10,2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS chieudaiphoi_truoccat INT,
  ADD COLUMN IF NOT EXISTS phandu_saucat INT,
  ADD COLUMN IF NOT EXISTS loai_phandu TEXT NOT NULL DEFAULT 'PHE_LIEU',
  ADD COLUMN IF NOT EXISTS score NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS lydochon TEXT;

DO $$
BEGIN
  -- Neu bang da ton tai tu migration cu voi mactdh nullable, CHECK NOT VALID se chan du lieu moi bi null
  -- ma khong lam fail migration vi du lieu cu.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chitietdexuatcat_mactdh_not_null'
      AND conrelid = 'chitietdexuatcat'::regclass
  ) THEN
    ALTER TABLE chitietdexuatcat
      ADD CONSTRAINT chitietdexuatcat_mactdh_not_null
      CHECK (mactdh IS NOT NULL) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chitietdexuatcat_chieudaicat_positive'
      AND conrelid = 'chitietdexuatcat'::regclass
  ) THEN
    ALTER TABLE chitietdexuatcat
      ADD CONSTRAINT chitietdexuatcat_chieudaicat_positive
      CHECK (chieudaicat > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chitietdexuatcat_thutucat_positive'
      AND conrelid = 'chitietdexuatcat'::regclass
  ) THEN
    ALTER TABLE chitietdexuatcat
      ADD CONSTRAINT chitietdexuatcat_thutucat_positive
      CHECK (thutucat > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chitietdexuatcat_kerf_non_negative'
      AND conrelid = 'chitietdexuatcat'::regclass
  ) THEN
    ALTER TABLE chitietdexuatcat
      ADD CONSTRAINT chitietdexuatcat_kerf_non_negative
      CHECK (kerf_mm >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chitietdexuatcat_loai_phandu_check'
      AND conrelid = 'chitietdexuatcat'::regclass
  ) THEN
    ALTER TABLE chitietdexuatcat
      ADD CONSTRAINT chitietdexuatcat_loai_phandu_check
      CHECK (loai_phandu IN ('TAI_SU_DUNG', 'PHE_LIEU', 'LO_CO')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dexuatcat_mapc ON dexuatcat(mapc);
CREATE INDEX IF NOT EXISTS idx_dexuatcat_matho ON dexuatcat(matho);
CREATE INDEX IF NOT EXISTS idx_dexuatcat_trangthai ON dexuatcat(trangthai);
CREATE INDEX IF NOT EXISTS idx_dexuatcat_ngaytao ON dexuatcat(ngaytao DESC);
CREATE INDEX IF NOT EXISTS idx_chitietdexuatcat_madxc ON chitietdexuatcat(madxc);
CREATE INDEX IF NOT EXISTS idx_chitietdexuatcat_maphoi ON chitietdexuatcat(maphoi);
CREATE INDEX IF NOT EXISTS idx_chitietdexuatcat_mactdh ON chitietdexuatcat(mactdh);

-- -----------------------------------------------------
-- 5.1. RLS cho bang proposal.
-- -----------------------------------------------------
-- Hai bang proposal la du lieu nghiep vu nhay cam. App hien tai di qua Express backend,
-- nen RLS duoc bat de chan truy cap truc tiep tu client Supabase. Backend service role
-- van co the thao tac vi service role bypass RLS tren Supabase.
ALTER TABLE dexuatcat ENABLE ROW LEVEL SECURITY;
ALTER TABLE chitietdexuatcat ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- 6. RPC approve_cutting_proposal
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION approve_cutting_proposal(
  p_proposal_id INT,
  p_admin_id INT,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  message TEXT,
  proposal_id INT,
  mapc INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role TEXT;
  v_proposal dexuatcat%ROWTYPE;
  v_assignment RECORD;
  v_mapc INT;
  v_old_sodocat_ids INT[] := ARRAY[]::INT[];
  v_safe_margin NUMERIC(10,2) := 20;
  v_expire_reason TEXT := NULL;
  v_expected_detail_count INT := 0;
  v_inserted_detail_count INT := 0;
BEGIN
  -- Loi quyen/ky thuat thi RAISE de caller biet request sai va transaction rollback.
  SELECT nd.vaitro::TEXT
    INTO v_admin_role
  FROM nguoidung nd
  WHERE nd.mand = p_admin_id;

  IF v_admin_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Nguoi dung % khong co quyen ADMIN de duyet de xuat cat', p_admin_id
      USING ERRCODE = '42501';
  END IF;

  -- Lock proposal truoc de tranh hai admin cung duyet/cap nhat mot proposal.
  SELECT dx.*
    INTO v_proposal
  FROM dexuatcat dx
  WHERE dx.madxc = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay de xuat cat %', p_proposal_id
      USING ERRCODE = 'P0002';
  END IF;

  v_mapc := v_proposal.mapc;

  IF v_proposal.trangthai::TEXT <> 'CHO_DUYET' THEN
    RETURN QUERY
      SELECT
        'INVALID_STATE'::TEXT,
        format('De xuat dang o trang thai %s, khong the duyet.', v_proposal.trangthai::TEXT)::TEXT,
        p_proposal_id,
        v_mapc;
    RETURN;
  END IF;

  -- Lock phan cong de ngan thay doi song song khi approve.
  SELECT pc.mapc, pc.madh, pc.matho, pc.trangthai
    INTO v_assignment
  FROM phancong pc
  WHERE pc.mapc = v_mapc
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Phan cong % khong ton tai cho de xuat %', v_mapc, p_proposal_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Lock toan bo so do cat hien tai cua phan cong.
  SELECT COALESCE(array_agg(locked_sdc.masdc ORDER BY locked_sdc.masdc), ARRAY[]::INT[])
    INTO v_old_sodocat_ids
  FROM (
    SELECT s.masdc
    FROM sodocat s
    WHERE s.mapc = v_mapc
    ORDER BY s.masdc
    FOR UPDATE
  ) AS locked_sdc;

  -- Lock chi tiet cat cu de trang thai DA_CAT khong bi thay doi xen giua luc revalidate va hard replace.
  PERFORM 1
  FROM chitietcat ct
  WHERE ct.masdc = ANY(v_old_sodocat_ids)
  ORDER BY ct.mactc
  FOR UPDATE;

  -- Lock detail proposal de noi dung proposal khong doi trong luc approve.
  PERFORM 1
  FROM chitietdexuatcat ctdx
  WHERE ctdx.madxc = p_proposal_id
  ORDER BY ctdx.mactdxc
  FOR UPDATE;

  -- Lock phoi theo thu tu tang dan de giam nguy co deadlock khi nhieu proposal dung chung phoi.
  PERFORM 1
  FROM khothanhphoi k
  JOIN (
    SELECT DISTINCT ctdx.maphoi
    FROM chitietdexuatcat ctdx
    WHERE ctdx.madxc = p_proposal_id
  ) d ON d.maphoi = k.maphoi
  ORDER BY k.maphoi
  FOR UPDATE OF k;

  -- Snapshot chi dung audit trong Dot 4. Approve dung rule hien tai de revalidate.
  SELECT COALESCE(
    (SELECT qt.giatri FROM quytac qt WHERE qt.maqt = 'SAFE_MARGIN'),
    20
  )
    INTO v_safe_margin;

  -- Cac loi nghiep vu/stale du doan duoc: set v_expire_reason, cuoi ham update HET_HIEU_LUC roi return EXPIRED.
  -- Khong RAISE nhung loi nay vi can luu lai audit proposal het hieu luc.
  IF EXISTS (
    SELECT 1
    FROM sodocat s
    WHERE s.mapc = v_mapc
      AND s.trangthai::TEXT IN ('DANG_CAT', 'HOAN_THANH')
  ) THEN
    v_expire_reason := 'So do cu da dang cat hoac da hoan thanh.';
  END IF;

  IF v_expire_reason IS NULL AND EXISTS (
    SELECT 1
    FROM chitietcat ct
    WHERE ct.masdc = ANY(v_old_sodocat_ids)
      AND ct.trangthai::TEXT = 'DA_CAT'
  ) THEN
    v_expire_reason := 'So do cu da co nhat cat DA_CAT.';
  END IF;

  IF v_expire_reason IS NULL AND EXISTS (
    SELECT 1
    FROM nhatkygiacong nk
    WHERE nk.sukien::TEXT = 'CAT'
      AND (
        nk.mapc = v_mapc
        OR (nk.masdc IS NOT NULL AND nk.masdc = ANY(v_old_sodocat_ids))
      )
  ) THEN
    v_expire_reason := 'Phan cong/so do cu da co nhat ky cat thuc te.';
  END IF;

  IF v_expire_reason IS NULL AND EXISTS (
    SELECT 1
    FROM nhatkygiacong nk
    WHERE nk.sukien::TEXT = 'LOI'
      AND COALESCE(nk.trangthaixuly, 'CHO_XU_LY') = 'CHO_XU_LY'
      AND (
        nk.mapc = v_mapc
        OR (nk.masdc IS NOT NULL AND nk.masdc = ANY(v_old_sodocat_ids))
        OR nk.maphoi IN (
          SELECT DISTINCT ctdx.maphoi
          FROM chitietdexuatcat ctdx
          WHERE ctdx.madxc = p_proposal_id
        )
      )
  ) THEN
    v_expire_reason := 'Dang co su co phoi/so do chua xu ly.';
  END IF;

  IF v_expire_reason IS NULL AND NOT EXISTS (
    SELECT 1
    FROM chitietdexuatcat ctdx
    WHERE ctdx.madxc = p_proposal_id
  ) THEN
    v_expire_reason := 'De xuat khong co chi tiet nhat cat.';
  END IF;

  IF v_expire_reason IS NULL AND EXISTS (
    SELECT 1
    FROM chitietdexuatcat ctdx
    LEFT JOIN chitietdh ctdh ON ctdh.mactdh = ctdx.mactdh
    LEFT JOIN khothanhphoi k ON k.maphoi = ctdx.maphoi
    WHERE ctdx.madxc = p_proposal_id
      AND (
        ctdx.mactdh IS NULL
        OR ctdh.mactdh IS NULL
        OR ctdh.madh <> v_assignment.madh
        OR ctdh.chieudaicat IS NULL
        OR ctdx.chieudaicat <= 0
        OR COALESCE(ctdx.kerf_mm, 0) < 0
        OR ctdx.chieudaicat <> ctdh.chieudaicat
        OR k.maphoi IS NULL
        OR k.trangthai::TEXT = 'BO_DI'
        OR k.mavt <> ctdh.mavt
      )
  ) THEN
    v_expire_reason := 'Chi tiet de xuat khong khop BOM, vat tu hoac trang thai phoi hien tai.';
  END IF;

  -- SAFE_MARGIN khop thuat toan Dot 2:
  -- chieu dai kha dung = chieudaihientai - SAFE_MARGIN * 2, chi tru mot lan luc khoi tao cay phoi.
  IF v_expire_reason IS NULL AND EXISTS (
    WITH used_by_stock AS (
      SELECT
        ctdx.maphoi,
        SUM(ctdx.chieudaicat::NUMERIC + COALESCE(ctdx.kerf_mm, 0)::NUMERIC) AS total_used
      FROM chitietdexuatcat ctdx
      WHERE ctdx.madxc = p_proposal_id
      GROUP BY ctdx.maphoi
    )
    SELECT 1
    FROM used_by_stock u
    JOIN khothanhphoi k ON k.maphoi = u.maphoi
    WHERE u.total_used > GREATEST(k.chieudaihientai::NUMERIC - (v_safe_margin * 2), 0)
  ) THEN
    v_expire_reason := 'Tong chieu dai cat va kerf vuot chieu dai kha dung cua phoi hien tai.';
  END IF;

  -- Revalidate BOM: khong thieu, khong du, khong co mactdh la.
  IF v_expire_reason IS NULL AND EXISTS (
    WITH required_bom AS (
      SELECT ctdh.mactdh, ctdh.soluong
      FROM chitietdh ctdh
      WHERE ctdh.madh = v_assignment.madh
        AND ctdh.chieudaicat IS NOT NULL
        AND ctdh.chieudaicat > 0
    ),
    proposed_bom AS (
      SELECT ctdx.mactdh, COUNT(*)::INT AS soluong
      FROM chitietdexuatcat ctdx
      WHERE ctdx.madxc = p_proposal_id
      GROUP BY ctdx.mactdh
    )
    SELECT 1
    FROM required_bom r
    FULL OUTER JOIN proposed_bom p ON p.mactdh = r.mactdh
    WHERE r.mactdh IS NULL
      OR p.mactdh IS NULL
      OR COALESCE(p.soluong, 0) <> COALESCE(r.soluong, 0)
  ) THEN
    v_expire_reason := 'So luong nhat cat trong de xuat khong khop BOM hien tai.';
  END IF;

  IF v_expire_reason IS NOT NULL THEN
    UPDATE dexuatcat dx
    SET trangthai = 'HET_HIEU_LUC',
        ngayduyet = NOW(),
        nguoiduyet = p_admin_id,
        admin_ghichu = CONCAT_WS(E'\n', NULLIF(p_admin_note, ''), v_expire_reason)
    WHERE dx.madxc = p_proposal_id;

    RETURN QUERY
      SELECT 'EXPIRED'::TEXT, v_expire_reason::TEXT, p_proposal_id, v_mapc;
    RETURN;
  END IF;

  SELECT COUNT(*)
    INTO v_expected_detail_count
  FROM chitietdexuatcat ctdx
  WHERE ctdx.madxc = p_proposal_id;

  -- Hard replace: xoa so do cu va tao so do moi nam trong cung RPC transaction.
  -- Neu bat ky lenh insert/update nao loi, PostgreSQL rollback toan bo function, so do cu khong bi mat.
  DELETE FROM chitietcat ct
  WHERE ct.masdc = ANY(v_old_sodocat_ids);

  DELETE FROM sodocat s
  WHERE s.mapc = v_mapc;

  WITH new_sodocat AS (
    INSERT INTO sodocat (mapc, maphoi, trangthai)
    SELECT DISTINCT
      v_mapc,
      ctdx.maphoi,
      'CHO_DUYET'::trang_thai_so_do_cat
    FROM chitietdexuatcat ctdx
    WHERE ctdx.madxc = p_proposal_id
    ORDER BY ctdx.maphoi
    RETURNING masdc, maphoi
  )
  INSERT INTO chitietcat (masdc, mactdh, thutucat, chieudaicat, trangthai)
  SELECT
    ns.masdc,
    ctdx.mactdh,
    ctdx.thutucat,
    ctdx.chieudaicat,
    'CHO_CAT'::trang_thai_chi_tiet_cat
  FROM chitietdexuatcat ctdx
  JOIN new_sodocat ns ON ns.maphoi = ctdx.maphoi
  WHERE ctdx.madxc = p_proposal_id
  ORDER BY ns.masdc, ctdx.thutucat, ctdx.mactdxc;

  GET DIAGNOSTICS v_inserted_detail_count = ROW_COUNT;

  IF v_inserted_detail_count <> v_expected_detail_count THEN
    RAISE EXCEPTION 'So chi tiet cat moi (%) khong khop so chi tiet de xuat (%)',
      v_inserted_detail_count, v_expected_detail_count
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE dexuatcat dx
  SET trangthai = 'DA_DUYET',
      ngayduyet = NOW(),
      nguoiduyet = p_admin_id,
      admin_ghichu = p_admin_note
  WHERE dx.madxc = p_proposal_id;

  -- Sau khi mot proposal duoc duyet, cac proposal CHO_DUYET khac cung mapc khong con dung snapshot/so do goc nua.
  UPDATE dexuatcat dx
  SET trangthai = 'HET_HIEU_LUC',
      ngayduyet = NOW(),
      nguoiduyet = p_admin_id,
      admin_ghichu = COALESCE(NULLIF(dx.admin_ghichu, '') || E'\n', '') ||
        'De xuat het hieu luc vi mot de xuat khac cung phan cong da duoc duyet.'
  WHERE dx.mapc = v_mapc
    AND dx.madxc <> p_proposal_id
    AND dx.trangthai::TEXT = 'CHO_DUYET';

  RETURN QUERY
    SELECT 'APPROVED'::TEXT, 'Da duyet de xuat va thay the so do cat trong transaction.'::TEXT, p_proposal_id, v_mapc;
END;
$$;

-- -----------------------------------------------------
-- 7. RPC reject_cutting_proposal
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION reject_cutting_proposal(
  p_proposal_id INT,
  p_admin_id INT,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  message TEXT,
  proposal_id INT,
  mapc INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role TEXT;
  v_proposal dexuatcat%ROWTYPE;
BEGIN
  SELECT nd.vaitro::TEXT
    INTO v_admin_role
  FROM nguoidung nd
  WHERE nd.mand = p_admin_id;

  IF v_admin_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Nguoi dung % khong co quyen ADMIN de tu choi de xuat cat', p_admin_id
      USING ERRCODE = '42501';
  END IF;

  -- Reject chi can lock proposal. Khong sua sodocat/chitietcat nen khong can lock kho/so do.
  SELECT dx.*
    INTO v_proposal
  FROM dexuatcat dx
  WHERE dx.madxc = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay de xuat cat %', p_proposal_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_proposal.trangthai::TEXT <> 'CHO_DUYET' THEN
    RETURN QUERY
      SELECT
        'INVALID_STATE'::TEXT,
        format('De xuat dang o trang thai %s, khong the tu choi.', v_proposal.trangthai::TEXT)::TEXT,
        p_proposal_id,
        v_proposal.mapc;
    RETURN;
  END IF;

  UPDATE dexuatcat dx
  SET trangthai = 'TU_CHOI',
      ngayduyet = NOW(),
      nguoiduyet = p_admin_id,
      admin_ghichu = p_admin_note
  WHERE dx.madxc = p_proposal_id;

  RETURN QUERY
    SELECT 'REJECTED'::TEXT, 'Da tu choi de xuat cat. So do chinh thuc khong thay doi.'::TEXT, p_proposal_id, v_proposal.mapc;
END;
$$;

-- -----------------------------------------------------
-- 8. Quyen goi RPC proposal.
-- -----------------------------------------------------
-- Function duoc tao SECURITY DEFINER de chay duoc transaction thay the so do trong DB.
-- Vi vay khong de PUBLIC/anon/authenticated goi truc tiep qua Supabase RPC, tranh viec
-- client tu truyen p_admin_id. Express backend se goi bang service role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION approve_cutting_proposal(INT, INT, TEXT) FROM anon;
    REVOKE ALL ON FUNCTION reject_cutting_proposal(INT, INT, TEXT) FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION approve_cutting_proposal(INT, INT, TEXT) FROM authenticated;
    REVOKE ALL ON FUNCTION reject_cutting_proposal(INT, INT, TEXT) FROM authenticated;
  END IF;

  REVOKE ALL ON FUNCTION approve_cutting_proposal(INT, INT, TEXT) FROM PUBLIC;
  REVOKE ALL ON FUNCTION reject_cutting_proposal(INT, INT, TEXT) FROM PUBLIC;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION approve_cutting_proposal(INT, INT, TEXT) TO service_role;
    GRANT EXECUTE ON FUNCTION reject_cutting_proposal(INT, INT, TEXT) TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
