# Tài liệu phản biện chuyên đề - Mini-ERP Nhôm Kính Chí Thành

## 1. Tổng quan hệ thống

**Tên đề tài:** Xây dựng hệ thống Mini-ERP quản lý sản xuất nhôm kính

**Mục tiêu:** Số hóa quy trình từ tiếp nhận đơn → lập BOM → báo giá → thanh toán → phân công → tối ưu cắt → sản xuất → hoàn thành.

**Đối tượng sử dụng:**
- **Admin (Quản lý):** Quản lý toàn bộ quy trình, khách hàng, vật tư, kho phôi, thanh toán, phân công thợ, xử lý sự cố
- **Worker (Thợ):** Nhận việc qua điện thoại, xem sơ đồ cắt, xác nhận hoàn thành, báo sự cố

**Quy mô:** 20+ chức năng, 17 bảng CSDL chính, 2 vai trò, thiết kế Mobile-First cho Worker. Nếu môi trường Supabase còn hiện 18 bảng thì thường là do chưa chạy migration `12_drop_unused_thongbaodadoc.sql` để bỏ bảng đọc thông báo legacy.

---

## 2. Kiến trúc 3 tầng

```
┌─────────────────────────┐
│   Frontend (Next.js 16) │  React 19 + TailwindCSS 4 + Recharts
│   FE/src/               │  React hooks + API helper; React Query/Zustand đã cài để mở rộng
├─────────────────────────┤
│   Backend (Express 4)   │  TypeScript + Zod validation + Nodemailer
│   BE/src/               │  17 modules nghiệp vụ
├─────────────────────────┤
│   Database (PostgreSQL) │  Supabase · 17 bảng chính · RLS · 11 ENUM
│   supabase_scripts/     │  24 indexes
└─────────────────────────┘
```

**Luồng request:** Browser → Next.js rewrite `/api/*` → Express → Supabase PostgreSQL

**Bảo mật:** Supabase Auth (JWT) → `authMiddleware` verify token → `requireRole()` kiểm tra ADMIN/WORKER

---

## 3. Cơ sở dữ liệu

### 17 bảng chính

> Ghi chú: bảng `thongbaodadoc` là bảng cũ dùng cho trạng thái đọc thông báo. Hệ thống hiện dùng trực tiếp `thongbao.daxem`, nên đã có migration `12_drop_unused_thongbaodadoc.sql` để xóa bảng legacy này.

| Nhóm | Bảng | Chức năng |
|---|---|---|
| Cấu hình | `quytac`, `danhmuc` | Quy tắc nghiệp vụ (kerf, scrap), danh mục vật tư |
| Người dùng | `nguoidung`, `yeucaucapquyen` | Quản lý nhân viên, xin cấp quyền |
| Khách hàng | `khachhang` | Thông tin KH, email, địa chỉ + tìm theo SĐT/email |
| Vật tư | `vattu`, `lonhap`, `khothanhphoi` | Master data, lô nhập, phôi (Immutable ID) |
| Đơn hàng | `donhang`, `chitietdh` | Đơn hàng + BOM chi tiết |
| Sản xuất | `phancong`, `sodocat`, `chitietcat` | Phân công thợ, sơ đồ cắt tối ưu |
| Nhật ký | `nhatkygiacong` | Ghi nhận cắt, sự cố phôi |
| Tài chính | `giaodich` | Thanh toán + công nợ |
| Hệ thống | `hinhanh`, `thongbao` | Hình ảnh, thông báo |

### 11 ENUM types
`trang_thai_dh`, `trang_thai_pc`, `trang_thai_phoi`, `trang_thai_sdc`, `trang_thai_chitietcat`, `loai_giao_dich`, `phuong_thuc_tt`, `vai_tro`, `trang_thai_nd`, `loai_su_kien`, `trang_thai_su_co`

---

## 4. Bảng chức năng và vị trí code

| # | Chức năng | Frontend | Backend Service | DB Tables |
|---|---|---|---|---|
| 1 | Đăng nhập/Phân quyền | `login/page.tsx` | `auth.routes.ts` + `middlewares/auth.ts` + `rbac.ts` | `nguoidung` |
| 2 | Xin cấp quyền | `login/page.tsx` (modal) | `access-requests/` | `yeucaucapquyen` |
| 3 | Quản lý khách hàng | `admin/khach-hang/` | `customers.service.ts` | `khachhang` |
| 4 | Quản lý đơn hàng | `admin/don-hang/` | `orders.service.ts` | `donhang`, `chitietdh` |
| 5 | Tạo đơn hàng | `admin/don-hang/create/` | `orders.service.ts → create()` | `donhang`, `chitietdh`, `khachhang` |
| 6 | Lập/Sửa BOM | `admin/don-hang/[id]/bom` | `orders.service.ts → updateDetails()` | `chitietdh`, `vattu` |
| 7 | Gửi báo giá email | `admin/don-hang/[id]/bao-gia` | `emails.routes.ts` + `mailer.ts` | `donhang` |
| 8 | Duyệt giá | `admin/don-hang/[id]/bao-gia` → `admin/don-hang/[id]` | `orders.service.ts → approvePrice()` | `donhang` |
| 9 | Thanh toán | `admin/thanh-toan/` | `payments.service.ts` | `giaodich`, `donhang` |
| 10 | Phân công thợ | `admin/phan-cong/` | `assignments.service.ts` | `phancong` |
| 11 | Quản lý kho phôi | `admin/kho-phoi/` | `raw-stock.service.ts` | `khothanhphoi`, `lonhap` |
| 12 | Tối ưu cắt (1D-CSP) | `admin/toi-uu-cat/` | `cutting-plans.service.ts` | `sodocat`, `chitietcat` |
| 13 | Worker nhận việc | `worker/tasks/` | `worker-tasks.service.ts` | `phancong` |
| 14 | Worker cắt phôi | `worker/cat/` | `cutting-plans.service.ts → completePlan()` | `sodocat`, `nhatkygiacong` |
| 15 | Báo sự cố phôi | `worker/cat/` | `cutting-plans.service.ts → reportIssue()` | `nhatkygiacong` |
| 16 | Xử lý sự cố | `admin/su-co/` | `cutting-plans.service.ts → scrapIssue()/trimIssue()` | `nhatkygiacong`, `khothanhphoi` |
| 17 | Dashboard Admin | `admin/page.tsx` | Gọi nhiều API | `donhang`, `nguoidung` |
| 18 | Dashboard Worker | `worker/page.tsx` | Supabase client trực tiếp* | `nguoidung`, `phancong` |
| 19 | Thông báo | Header component | `notifications.service.ts` | `thongbao` |
| 20 | Quản lý vật tư | `admin/vat-tu/` | `materials.service.ts` | `vattu`, `danhmuc` |

*Worker Dashboard hiện còn truy vấn Supabase client trực tiếp — xem mục Hạn chế.

---

## 5. Luồng nghiệp vụ chính

### 5.1 Tạo đơn hàng → BOM → Báo giá → Duyệt giá
1. Admin nhập KH (tên, SĐT, email, địa chỉ) ở `/admin/don-hang/create` → `getOrCreateCustomer()` tìm theo SĐT, chưa có thì tạo mới.
2. `POST /api/admin/orders` tạo đơn tiếp nhận ban đầu. Nếu chưa có BOM thì trạng thái là `KHAO_SAT`; nếu payload có BOM thì trạng thái là `BAO_GIA_NHAP`.
3. Admin sang `/admin/don-hang/[id]/bom` chọn mẫu cửa hoặc nhập BOM thủ công. `updateDetails()` xóa BOM cũ, tính lại đơn giá bằng `resolveLineUnitPrices()`, lưu `chitietdh`, reset dấu đã gửi báo giá.
4. Admin sang `/admin/don-hang/[id]/bao-gia` để kiểm tra báo giá. Gửi email báo giá → `lib/mailer.ts` soạn HTML → SMTP Gmail → `markQuoteSent()` ghi `baogia_gui_luc` và `baogia_email`.
5. Khi khách đồng ý, Admin bấm "Khách đã xác nhận / Duyệt giá". `approvePrice()` kiểm tra đã gửi báo giá rồi mới chuyển `DA_DUYET_GIA`.

### 5.2 Thanh toán
1. `POST /api/admin/payments` → kiểm tra đơn đã duyệt giá
2. Insert `giaodich` → tính tổng đã trả vs tổng giá trị
3. Auto chuyển trạng thái: `DA_COC` (trả 1 phần) hoặc `DA_THANH_TOAN` (trả đủ)

### 5.3 Phân công → Tối ưu cắt → Worker thực hiện
1. Phân công: kiểm tra thợ WORKER + DANG_LAM + không bận → insert `phancong`
2. Tối ưu cắt: `expandPieces()` chuyển BOM → mảnh cắt riêng lẻ → `planCuts()` FFD bin-packing (ưu tiên phôi CON_DU, kerf=5mm, scrap≤100mm)
3. Worker xác nhận cắt → `completePlan()`: trừ chiều dài phôi, ghi nhật ký, auto hoàn thành phân công
4. Sự cố: Worker báo lỗi → Admin bỏ phôi hoặc cắt bỏ đoạn lỗi

---

## 6. Câu hỏi phản biện và gợi ý trả lời

| # | Câu hỏi | Gợi ý trả lời | File code | Bảng DB |
|---|---|---|---|---|
| 1 | Xác thực người dùng hoạt động thế nào? | Supabase Auth JWT → middleware verify → tra bảng nguoidung lấy vai trò → gắn req.user | `middlewares/auth.ts` | `nguoidung` |
| 2 | Phân quyền ADMIN/WORKER ra sao? | `requireRole()` kiểm tra vaitro. Routes prefix `/admin/*` và `/worker/*` | `middlewares/rbac.ts`, `routes/index.ts` | `nguoidung` |
| 3 | Quy trình tạo đơn hàng? | Tách 4 bước: nhập KH → lập BOM → gửi báo giá → khách đồng ý mới duyệt giá. `create()` chỉ tạo đơn tiếp nhận, BOM được lưu ở bước riêng | `orders.service.ts → create()/updateDetails()/approvePrice()` | `donhang`, `chitietdh`, `khachhang` |
| 4 | BOM lập như thế nào? | `resolveLineUnitPrices()` tra bảng vattu → tính đơn giá theo chiều dài hoặc diện tích | `orders.service.ts` | `chitietdh`, `vattu` |
| 5 | Thuật toán tối ưu cắt? | 1D-CSP + FFD: expandPieces → sắp giảm dần → planCuts tìm phôi phù hợp, kerf=5mm, scrap≤100mm | `cutting-plans.service.ts` | `sodocat`, `chitietcat` |
| 6 | Thanh toán và công nợ? | Mỗi giao dịch → tính tổng đã trả → so sánh tonggiatri → auto chuyển DA_COC/DA_THANH_TOAN | `payments.service.ts` | `giaodich`, `donhang` |
| 7 | Gửi email báo giá? | Nodemailer + SMTP Gmail → HTML template → ghi timestamp baogia_gui_luc | `emails.routes.ts`, `mailer.ts` | `donhang` |
| 8 | Tại sao duyệt giá trước thanh toán? | Business rule: đảm bảo KH xác nhận giá. approvePrice kiểm tra baogia_gui_luc != null | `orders.service.ts` | `donhang` |
| 9 | Worker nhận/từ chối việc? | Xem danh sách → chấp nhận (DANG_THUC_HIEN) hoặc từ chối (TU_CHOI + lý do) → thông báo Admin | `worker-tasks.service.ts` | `phancong` |
| 10 | Xử lý sự cố cắt hỏng? | Worker báo lỗi → ghi nhatkygiacong LOI → Admin bỏ phôi (BO_DI) hoặc cắt bỏ đoạn lỗi (trim) | `cutting-plans.service.ts` | `nhatkygiacong`, `khothanhphoi` |
| 11 | Immutable ID kho phôi? | Mỗi thanh phôi = 1 bản ghi maphoi. Chiều dài giảm qua cắt. Truy xuất nguồn gốc 100% | `raw-stock.service.ts` | `khothanhphoi`, `lonhap` |
| 12 | Tại sao chọn Supabase? | PostgreSQL mạnh ENUM/FK/RLS. Supabase cung cấp Auth + Realtime sẵn. Phù hợp dự án vừa nhỏ | `lib/supabase.ts` | Tất cả |
| 13 | FE kết nối BE thế nào? | Next.js rewrite `/api/*` → BE Express (tránh CORS mobile LAN). JWT gắn tự động | `lib/api.ts`, `next.config.ts` | — |
| 14 | Validate dữ liệu đầu vào? | Zod schema → middleware validate() → reject nếu sai format trước khi vào service | `middlewares/validate.ts` | — |
| 15 | Worker Dashboard dùng Supabase trực tiếp? | Hạn chế kiến trúc, chưa thống nhất qua API. Hướng phát triển: chuẩn hóa qua Backend | `worker/page.tsx` | `nguoidung`, `phancong` |
| 16 | Hệ thống thông báo? | Mỗi action quan trọng → createForAdmins() insert thongbao cho tất cả Admin | `notifications.service.ts` | `thongbao` |
| 17 | Thợ đang bận có phân công được không? | Không. getBusyAssignmentForWorker() kiểm tra → throw lỗi nếu có phân công đang mở | `assignments.service.ts` | `phancong` |

---

## 7. Mapping Slide ↔ Demo ↔ Code ↔ Database

| Slide | Demo màn hình | Mở file code | Mở bảng Supabase |
|---|---|---|---|
| 1. Tên đề tài | — | — | — |
| 2. Lý do chọn đề tài | — | — | — |
| 3. Mục tiêu | — | — | — |
| 4. Phạm vi | — | — | — |
| 5. Công nghệ | — | `BE/package.json`, `FE/package.json` | — |
| 6. Kiến trúc | — | `app.ts`, `routes/index.ts`, `lib/api.ts` | — |
| 7. CSDL | — | `01_schema_final.sql` | Mở Table Editor → xem cấu trúc |
| 8. Quy trình nghiệp vụ | Tạo đơn → Lập BOM → Gửi báo giá → Khách xác nhận → Duyệt giá | `orders.service.ts` | `donhang`, `chitietdh` |
| 9. Chức năng chính | Lướt sidebar Admin | `routes/index.ts` | — |
| 10. Demo giao diện | Login → Dashboard → Tạo đơn → Thanh toán → Worker | — | — |
| 11. Thuật toán cắt | Trang Tối ưu cắt → tạo sơ đồ → xử lý thiếu phôi nếu có | `cutting-plans.service.ts (planCuts)` | `sodocat`, `chitietcat` |
| 12. Kết quả & Hạn chế | — | — | — |
| 13. Hướng phát triển | — | — | — |

---

## 8. Hạn chế và hướng phát triển

### Hạn chế hiện tại
1. **Worker Dashboard** hiện còn truy vấn Supabase client trực tiếp ở một số phần hiển thị dữ liệu nhanh. Đây là hạn chế về mặt kiến trúc vì chưa thống nhất hoàn toàn qua Backend API.
2. **Chưa có upload ảnh** khảo sát/nghiệm thu (bảng `hinhanh` đã có nhưng chưa dùng)
3. **Chưa có chế độ offline** cho Worker khi mất mạng tại xưởng
4. **Chưa có báo cáo doanh thu** nâng cao / xuất Excel
5. **Chưa có unit test** tự động

### Lưu ý khi phản biện/demo
1. Cần chạy đầy đủ migration mới nhất trước khi demo: đặc biệt `07_quote_email_tracking.sql`, `09_worker_reject_and_issue.sql`, `10_issue_resolution_workflow.sql`, `11_customer_email.sql`, `12_drop_unused_thongbaodadoc.sql`.
2. Nếu Supabase Table Editor vẫn thấy `thongbaodadoc`, nghĩa là migration 12 chưa được áp dụng; code runtime không còn phụ thuộc bảng này.
3. Email khách hàng là optional để tương thích dữ liệu cũ. Khi chưa có email, giao diện hiển thị "Chưa có email" và cho phép Admin nhập thủ công ở bước gửi báo giá/thanh toán.
4. Chỉ duyệt giá sau khi đã gửi báo giá và khách đồng ý; các luồng thanh toán/phân công/tối ưu cắt phải nằm sau trạng thái `DA_DUYET_GIA`.

### Hướng phát triển
1. Chuẩn hóa toàn bộ truy vấn qua Backend API thống nhất
2. Mobile app native (React Native) cho Worker
3. Upload ảnh khảo sát/nghiệm thu qua Supabase Storage
4. Báo cáo doanh thu, biểu đồ xu hướng, xuất PDF/Excel
5. AI dự đoán nhu cầu vật tư
6. Progressive Web App + offline support
