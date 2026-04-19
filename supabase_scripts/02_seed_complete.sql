-- =====================================================
-- SCRIPT 02: SEED HOÀN CHỈNH — DỮ LIỆU MASTER DOWES PRO
-- =====================================================
-- Bơm toàn bộ: Quy tắc sản xuất, Danh mục, Vật tư
-- (Kính, Nhân công, Phụ kiện, Nhôm thanh, Vật tư phụ)
-- =====================================================

-- ========================================================
-- 1. QUY TẮC SẢN XUẤT (quytac) — 9 hằng số
-- ========================================================
INSERT INTO quytac (maqt, tenqt, giatri) VALUES
    ('KERF',                'Độ hao hụt lưỡi cưa mỗi nhát cắt (mm)',           5.00),
    ('SAFE_MARGIN',         'Ngưỡng phế liệu an toàn tối thiểu (mm)',          100.00),
    ('NGAM_KINH_CUA_DI',   'Độ ngậm kính vào cánh cửa đi (mm)',               16.00),
    ('HO_CANH_NEN',         'Độ hở cánh - Nền (mm)',                            8.00),
    ('HO_CANH_KHUNG',       'Độ hở / độ phủ cánh - Khung bao (mm)',            5.00),
    ('HO_GIUA_CANH',        'Độ hở chính giữa cánh để lắp khóa (mm)',          5.00),
    ('NGAM_KINH_CUA_TRUOT', 'Độ ngậm kính vào cánh lùa (mm)',                  12.00),
    ('NGAM_CANH_RAY_DUOI',  'Độ ngậm cánh vào Ray Dưới (mm)',                  -8.00),
    ('NGAM_CANH_RAY_TRAI',  'Độ ngậm cánh vào Ray Trái (mm)',                  -10.00);

-- ========================================================
-- 2. DANH MỤC VẬT TƯ (danhmuc) — 5 nhóm
-- ========================================================
-- ID sẽ tự tăng: 1=Nhôm, 2=Kính, 3=Phụ Kiện, 4=Vật Tư Phụ, 5=Nhân Công
INSERT INTO danhmuc (tendm, mota) VALUES
    ('Nhôm',        'Các hệ nhôm thanh định hình (kích thước tính theo cây 6000mm)'),
    ('Kính',        'Kính trắng, kính hộp, kính cường lực (tính theo m²)'),
    ('Phụ Kiện',    'Bản lề, khóa, chốt, bánh xe (tính theo bộ/cái)'),
    ('Vật Tư Phụ',  'Gioăng, keo, vít, đệm, ke ép góc (tính cái/kg)'),
    ('Nhân Công',   'Phí nhân công gia công, lắp đặt');

-- ========================================================
-- 3. VẬT TƯ NHÓM KÍNH (vattu — madm=2) — 5 loại
-- ========================================================
INSERT INTO vattu (madm, tenvt, donvitinh, chieudaimacdinh, dongianhap, dongiaban) VALUES
    (2, 'Kính hộp 6.38 + 12 + 8.38',       'm2', NULL, 850000, 850000),
    (2, 'Kính hộp 8.38 + 6 + 8.38',        'm2', NULL, 900000, 900000),
    (2, 'Kính hộp 8.38 + 9 + 8.38',        'm2', NULL, 900000, 900000),
    (2, 'Kính hộp 8.38 + 12 + 8.38',       'm2', NULL, 950000, 950000),
    (2, 'Kính trắng CL 6ly (Mặc định)',    'm2', NULL, 300000, 300000);

-- ========================================================
-- 4. VẬT TƯ NHÓM NHÂN CÔNG (vattu — madm=5) — 3 loại
-- ========================================================
INSERT INTO vattu (madm, tenvt, donvitinh, chieudaimacdinh, dongianhap, dongiaban) VALUES
    (5, 'Nhân công gia công',   'kg', NULL, 20000, 20000),
    (5, 'Nhân công lắp đặt',   'm2', NULL, 85000, 85000),
    (5, 'Nhân công uốn vòm',   'md', NULL, 150000, 150000);

-- ========================================================
-- 5. VẬT TƯ NHÓM PHỤ KIỆN DOWES (vattu — madm=3) — 12 loại
-- ========================================================
INSERT INTO vattu (madm, tenvt, donvitinh, chieudaimacdinh, dongianhap, dongiaban) VALUES
    (3, 'Bản lề lá 4D',                            'cái', NULL, 80000, 80000),
    (3, 'Bản lề cối 3D',                           'cái', NULL, 144000, 144000),
    (3, 'Bản lề cối 2D',                           'cái', NULL, 62000, 62000),
    (3, 'Bản lề chữ A mở hất 10 inch',             'cái', NULL, 53000, 53000),
    (3, 'Bản lề chữ A mở hất 12 inch',             'cái', NULL, 62000, 62000),
    (3, 'Bản lề sàn 80kg',                         'bộ', NULL, 1000000, 1000000),
    (3, 'Bản lề sàn 150kg',                        'bộ', NULL, 1800000, 1800000),
    (3, 'Bánh xe đôi',                             'cái', NULL, 22000, 22000),
    (3, 'Khóa vân tay (Mật khẩu thẻ từ)',          'bộ', NULL, 1400000, 1400000),
    (3, 'Khóa đa điểm cửa trượt quay',            'bộ', NULL, 300000, 300000),
    (3, 'Tay nắm cong lớn 400',                    'bộ', NULL, 630000, 630000),
    (3, 'Chốt âm tự sập không chìa',               'cái', NULL, 34000, 34000);

-- ========================================================
-- 6. VẬT TƯ NHÔM THANH DOWES (vattu — madm=1) — 24 hệ
-- Toàn bộ ChieuDaiMacDinh = 6000mm (cây 6m chuẩn)
-- ========================================================
INSERT INTO vattu (madm, tenvt, donvitinh, chieudaimacdinh, dongianhap, dongiaban) VALUES
    (1, 'Xingfa (Q.Đông) - Khung bao cửa đi C3328 (Nâu sần / Xám ghi / Đen tuyền)', 'kg', 6000, 95000, 95000),
    (1, 'Xingfa (Q.Đông) - Khung bao cửa đi C3328 (Trắng sứ)',                        'kg', 6000, 92000, 92000),
    (1, 'Xingfa (Q.Đông) - Khung bao cửa đi C3328 (Vân gỗ)',                          'kg', 6000, 115000, 115000),
    (1, 'Xingfa (Q.Đông) - Cánh cửa đi mở ngoài C3303 (Nâu sần / Xám ghi)',          'kg', 6000, 95000, 95000),
    (1, 'Xingfa (Q.Đông) - Cánh cửa đi mở ngoài C3303 (Trắng sứ)',                    'kg', 6000, 92000, 92000),
    (1, 'Xingfa (Q.Đông) - Cánh cửa đi mở ngoài C3303 (Vân gỗ)',                      'kg', 6000, 115000, 115000),
    (1, 'Xingfa (Q.Đông) - Khung bao cửa sổ C3318 (Nâu sần / Xám ghi)',               'kg', 6000, 95000, 95000),
    (1, 'Xingfa (Q.Đông) - Hệ 93 Khung bao đứng ray bằng',                            'kg', 6000, 98000, 98000),
    (1, 'Xingfa (Q.Đông) - Hệ 93 Cánh lùa trơn / móc',                                'kg', 6000, 98000, 98000),
    (1, 'Xingfa (Q.Đông) - Hệ 63 Khung bao / Cánh xếp trượt',                         'kg', 6000, 105000, 105000),
    (1, 'Xingfa (VN) - Khung bao & Cánh cửa đi (Nâu/Trắng)',                          'kg', 6000, 82000, 82000),
    (1, 'Xingfa AD (Austdoor) - Hệ 55 Khung & Cánh cửa đi',                           'kg', 6000, 88000, 88000),
    (1, 'PMA Hệ 55 Vát cạnh - Khung & Cánh (Ghi/Nâu)',                                'kg', 6000, 78000, 78000),
    (1, 'JMA Hệ 60 Có cầu nhiệt - Khung & Cánh',                                      'kg', 6000, 135000, 135000),
    (1, 'Việt Pháp Hệ 450 - Cánh cửa đi bản to (Trắng sứ)',                           'kg', 6000, 75000, 75000),
    (1, 'Topal Prima - Khung & Cánh cửa đi',                                           'kg', 6000, 108000, 108000),
    (1, 'Topal Slima - Khung bao / Cánh cửa sổ',                                       'kg', 6000, 85000, 85000),
    (1, 'PMI Hệ PE45 - Khung & Cánh mở quay',                                         'kg', 6000, 125000, 125000),
    (1, 'Maxpro Hệ 58 - Khung bao / Cánh cửa đi',                                     'kg', 6000, 185000, 185000),
    (1, 'Civro Hệ 55/65 - Khung bao / Cánh cửa đi',                                   'kg', 6000, 280000, 280000),
    (1, 'Nhôm Cánh Kính - Thanh profile 20x45 (Đen mờ)',                               'kg', 6000, 145000, 145000),
    (1, 'Nhôm Cánh Kính - Thanh profile 20x45 (Vàng hồng)',                            'kg', 6000, 150000, 150000),
    (1, 'Grando Hệ XF55 - Khung bao / Cánh cửa đi',                                   'kg', 6000, 82000, 82000),
    (1, 'Nhôm hộp 20x40 / 25x50 / 30x60 (Trang trí & Khung Sắt)',                     'kg', 6000, 72000, 72000);

-- ========================================================
-- 7. VẬT TƯ PHỤ DOWES (vattu — madm=4) — 6 loại
-- ========================================================
INSERT INTO vattu (madm, tenvt, donvitinh, chieudaimacdinh, dongianhap, dongiaban) VALUES
    (4, 'Gioăng các loại (Cánh, chân kính, khung)',      'kg', NULL, 55000, 55000),
    (4, 'Ke tăng cứng / Ke tăng cứng xếp trượt',        'cái', NULL, 600, 600),
    (4, 'Đệm chống xệ gắn khung/cánh',                  'cái', NULL, 600, 600),
    (4, 'Ke ép góc 14x36 / 14x24 / 25x22 (Giá TB)',     'cái', NULL, 15000, 15000),
    (4, 'Vít lắp đặt',                                   'bộ', NULL, 40000, 40000),
    (4, 'Nêm kính',                                      'kg', NULL, 55000, 55000);

-- =====================================================
-- HOÀN TẤT SEED DATA
-- Tổng: 9 quy tắc + 5 danh mục + 50 vật tư
-- =====================================================
