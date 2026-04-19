// Dữ liệu trích xuất từ DOWES PRO - Phục vụ tính toán BOM và 1D-CSP

export const DOWES_CONFIG = {
  // 1. Cấu hình độ hở / ngậm tiêu chuẩn (mm)
  clearance: {
    cuaQuay: { // Cửa sổ & Cửa đi mở quay
      ngamKinh: 16.0,
      ngamPano: 16.0,
      hoNen: 8.0,
      hoKhungTren: 5.0,
      hoKhungDuoi: 5.0, // Cho cửa sổ
      hoKhungTrai: 5.0,
      hoKhungPhai: 5.0,
      hoGiuaCanh: 5.0, // Chỗ lắp khóa
      hoCanhVaCanh: 5.0,
    },
    vachCung: { // Hệ vách rời
      ngamKinh: 16.0,
      ngamPano: 16.0,
    },
    cuaTruot: { // Cửa đi & Cửa sổ lùa
      ngamKinh: 12.0,
      ngamPano: 12.0,
      ngamRayDuoi: -8.0,
      ngamRayTren: -8.0,
      ngamRayTrai: -10.0,
      ngamRayPhai: -10.0,
    }
  },

  // 2. Các nhãn hiệu nhôm phổ biến (Mặc định ~110,000 VNĐ/kg)
  aluminumBrands: [
    "XINGFA", "MAXPRO.JP", "PMA", "PMI", "BLK", "OWIN", "TOPAL", "GRANDO", "JMA", "SADONA"
  ],

  // 3. Cơ sở dữ liệu Giá Phụ Kiện (Bản lề, Khóa, Ke)
  pricing: {
    phuKien: [
      { name: "Bản lề lá 4D (cánh-cánh / khung-cánh)", price: 80000, unit: "cái" },
      { name: "Bản lề cối 3D", price: 144000, unit: "cái" },
      { name: "Bộ khóa vân tay", price: 1400000, unit: "bộ" },
      { name: "Thân khóa đa điểm", price: 134000, unit: "cái" },
      { name: "Tay nắm cửa thủy lực (600)", price: 500000, unit: "cái" },
      { name: "Ke góc vĩnh cửu", price: 15000, unit: "cái" },
    ],
    // Mức giá nhân công tiêu chuẩn
    labor: {
      giaCong: 20000, // đ/kg 
      lapDat: 85000, // đ/m2
      uonVom: 150000, // đ/m
    },
    kinh: [
      { name: "Kính hộp 6.38 + 12 + 8.38", price: 850000, unit: "VNĐ/m2"}
    ]
  }
};
