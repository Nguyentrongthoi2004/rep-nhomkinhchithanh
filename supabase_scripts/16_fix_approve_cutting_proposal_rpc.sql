-- =====================================================
-- SQL PATCH: FIX APPROVE_CUTTING_PROPOSAL TO PREVENT DOUBLE ALLOCATION
-- =====================================================

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

  -- Bo sung check dung trung thanh phoi giua cac so do active khac phan cong
  IF v_expire_reason IS NULL AND EXISTS (
    SELECT 1
    FROM sodocat s
    WHERE s.maphoi IN (
      SELECT DISTINCT ctdx.maphoi
      FROM chitietdexuatcat ctdx
      WHERE ctdx.madxc = p_proposal_id
    )
      AND s.trangthai::TEXT IN ('CHO_DUYET', 'DANG_CAT')
      AND s.mapc <> v_mapc
  ) THEN
    v_expire_reason := 'Một hoặc nhiều thanh phôi trong đề xuất đang được sử dụng bởi sơ đồ cắt hoạt động khác.';
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

-- Quyen goi RPC proposal
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION approve_cutting_proposal(INT, INT, TEXT) FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION approve_cutting_proposal(INT, INT, TEXT) FROM authenticated;
  END IF;

  REVOKE ALL ON FUNCTION approve_cutting_proposal(INT, INT, TEXT) FROM PUBLIC;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION approve_cutting_proposal(INT, INT, TEXT) TO service_role;
  END IF;
END $$;
