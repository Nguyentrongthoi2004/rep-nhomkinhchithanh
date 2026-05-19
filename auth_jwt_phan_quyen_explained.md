# Phân Tích Chuyên Sâu: Tài Khoản, Xác Thực (JWT) & Phân Quyền Trong Mini-ERP

Tài liệu này giải thích toàn bộ quy trình xác thực (Authentication) và phân quyền (Authorization) trong hệ thống Mini-ERP Nhôm Kính, dựa hoàn toàn vào mã nguồn (source code) thực tế.

---

## 1. Tổng quan kiến trúc xác thực

Hệ thống sử dụng mô hình **BaaS (Backend as a Service)** với **Supabase Auth** để quản lý danh tính, kết hợp với bảng `public.nguoidung` để quản lý hồ sơ nghiệp vụ.

- **Supabase Auth (Authentication Users):** Là hệ thống quản lý danh tính của Supabase (dựa trên GoTrue). Chịu trách nhiệm mã hóa và lưu trữ mật khẩu, xác thực người dùng, và cấp phát JWT. Bảng này nằm ở schema `auth.users` (ẩn với API thông thường).
- **Bảng `public.nguoidung`:** Là bảng trong CSDL của ứng dụng. Lưu trữ thông tin nghiệp vụ: mã người dùng (`mand`), tên đăng nhập (`tendangnhap`), họ tên, số điện thoại, trạng thái làm việc (`DANG_LAM`, `NGHI_VIEC`) và vai trò (`ADMIN`, `WORKER`).
- **Liên kết:** Hai hệ thống này liên kết logic với nhau qua **Email / Tên đăng nhập**. (VD: Username `tho_cat_01` sẽ được Supabase lưu là `tho_cat_01@minierp.local`, và map với cột `tendangnhap` trong `nguoidung`).
- **Session/Token ở Frontend:** Frontend không tự lưu token thủ công. Supabase Client SDK quản lý session, còn khi gọi API thì hàm `apiFetch` lấy access_token từ session hiện tại và gắn vào header Authorization.
- **Kiểm tra Token ở Backend:** Backend (Express) sử dụng `authMiddleware` để bóc tách JWT từ header `Authorization: Bearer <token>` và gọi API Supabase để xác minh chữ ký.
- **Phân biệt ADMIN / WORKER:** Sau khi xác minh JWT, Backend tra cứu bảng `nguoidung` để lấy cột `vaitro`. Cột này chứa giá trị `"ADMIN"` hoặc `"WORKER"`.

---

## 2. Quy trình tạo tài khoản

Hệ thống hỗ trợ 3 trường hợp sinh ra tài khoản:

### Trường hợp 1: Admin tạo tài khoản cho nhân viên
- **Thao tác:** Admin vào màn hình Quản lý nhân sự, gọi API tạo tài khoản.
- **Backend File/Route:** `BE/src/modules/users/users.service.ts` (Hàm `create()`).
- **Hoạt động:**
  1. Backend nối chuỗi để tạo email định dạng: `tendangnhap@minierp.local`.
  2. Gọi `supabaseAdmin.auth.admin.createUser()` để tạo user trong hệ thống Supabase Auth kèm theo mật khẩu admin chỉ định.
  3. Nếu Supabase thành công, tiếp tục Insert 1 bản ghi vào bảng `nguoidung` với `tendangnhap`, `hoten`, `vaitro`. Trạng thái mặc định là `DANG_LAM`.
  4. Nếu bước 3 lỗi, Backend sẽ tự động gọi `deleteUser` bên Supabase để rollback (đảm bảo tính toàn vẹn dữ liệu).

### Trường hợp 2: Người dùng tự xin cấp quyền
- **Thao tác:** Ở trang `login/page.tsx`, người dùng bấm "Xin cấp quyền", điền Họ tên, SĐT, Tên đăng nhập, Vai trò mong muốn.
- **Gửi request:** `POST /api/auth/request-access`.
- **Lưu trữ tạm:** Dữ liệu được Insert vào bảng `yeucaucapquyen` với trạng thái `PENDING`. (File: `access-requests.service.ts` -> `create()`). Đồng thời tạo một thông báo (Notification) gửi cho tất cả Admin.
- **Admin duyệt:** Admin vào trang `/admin/yeu-cau-cap-quyen`, bấm Duyệt. Gọi `POST /api/admin/access-requests/:id/approve`.
- **Backend xử lý duyệt (File `access-requests.service.ts` -> `update()`):**
  1. Tự động sinh mật khẩu ngẫu nhiên (`generatePassword(10)`).
  2. Tạo tài khoản trong Supabase Auth (`supabaseAdmin.auth.admin.createUser()`).
  3. Tạo hồ sơ trong bảng `public.nguoidung`.
  4. Đổi trạng thái bảng `yeucaucapquyen` thành `APPROVED`.
  5. Gửi email chứa thông tin đăng nhập và mật khẩu cho người xin quyền qua Nodemailer.

### Trường hợp 3: Quản trị viên gốc (Master Admin)
- Khi deploy, hệ thống được cấu hình biến môi trường `MASTER_ADMIN_EMAIL`.
- Khi user đăng nhập bằng email này, Frontend tự động gọi API `POST /api/auth/ensure-profile` (`auth.routes.ts`).
- Backend kiểm tra nếu đúng là email gốc, sẽ thực hiện UPSERT (Update hoặc Insert) vào bảng `nguoidung` với vai trò là `ADMIN`. Nhờ vậy, người dùng quản trị gốc không bao giờ bị khóa ra khỏi hệ thống kể cả khi bảng `nguoidung` trống.

---

## 3. Quy trình đăng nhập từ đầu tới cuối

Luồng đăng nhập diễn ra theo các bước sau:

1. **User mở trang Login:** Trang `FE/src/app/login/page.tsx`.
2. **Nhập thông tin:** Tên đăng nhập (hoặc email) và mật khẩu.
3. **Frontend gọi Supabase:** Trong hàm `handleLogin()`, frontend kiểm tra nếu đầu vào không có `@` thì nối thêm `@minierp.local`. Gọi hàm `supabase.auth.signInWithPassword()`.
4. **Supabase xử lý:** Supabase Auth nhận request, so sánh mã hash mật khẩu trong DB nội bộ của họ. 
5. **Trả kết quả:** Nếu đúng, Supabase trả về đối tượng `Session` chứa `access_token` (JWT). SDK Frontend tự động lưu JWT này vào Local Storage/Cookie.
6. **Master Admin Check:** Nếu email trùng `MASTER_ADMIN_EMAIL`, frontend gọi API `POST /api/auth/ensure-profile`.
7. **Lấy Profile:** Frontend gọi `GET /api/auth/me`. Hàm `apiFetch` (trong `FE/src/lib/api.ts`) sẽ tự động nhúng `access_token` vào Header `Authorization: Bearer <token>`.
8. **Backend Middleware (`auth.ts`):** Nhận request, đọc JWT từ Header. Khởi tạo Supabase client dựa trên token đó và gọi `supabase.auth.getUser()`.
   - Backend lấy JWT từ Authorization header, gửi token cho Supabase Auth kiểm tra thông qua supabase.auth.getUser(), nếu hợp lệ thì Supabase trả về thông tin user.
9. **Tra cứu DB:** Backend tìm bản ghi trong bảng `nguoidung` khớp với `tendangnhap` hoặc `email`.
10. **Backend trả về:** Nếu tìm thấy và trạng thái không phải `NGHI_VIEC`, trả về profile kèm `vaitro`.
11. **Điều hướng (Frontend):** Nếu `vaitro === "ADMIN"`, Next.js đẩy sang `/admin/vat-tu`. Nếu là `"WORKER"`, đẩy sang `/worker`.

---

## 4. JWT là gì trong hệ thống này?

- **JWT là gì:** JSON Web Token - Một chuỗi mã hóa an toàn gồm 3 phần (Header, Payload, Signature) dùng để xác thực request.
- **Ai tạo JWT:** Hệ thống **Supabase Auth** (GoTrue server) sinh ra và ký bằng khóa bí mật (JWT Secret).
- **Tạo khi nào:** Ngay sau khi người dùng đăng nhập thành công (`signInWithPassword`).
- **Chứa thông tin gì:** Chứa `sub` (chính là user `id` của bảng auth.users), `email`, thời gian hết hạn (`exp`). Nó KHÔNG chứa mã `mand` hay `vaitro` của bảng `nguoidung`.
- **Dùng để làm gì:** Thay thế vai trò của session cookie. Giúp Backend biết request đến từ người dùng hợp lệ nào mà không cần bắt họ gửi lại mật khẩu.
- **Gửi lên BE thế nào:** Frontend bỏ vào HTTP Header: `Authorization: Bearer <chuỗi_token>`.
- **Backend verify thế nào:** Backend truyền token này vào SDK `supabase.auth.getUser()`. SDK sẽ gọi về Supabase để verify chữ ký và xem token còn hạn hay không.
- **Trường hợp lỗi:** 
  - Token hết hạn / không hợp lệ: Backend văng lỗi `401 Unauthorized` ("Invalid or expired token").
  - Không gửi token: Backend văng lỗi `401 Unauthorized` ("Missing Bearer token").

---

## 5. Middleware xác thực backend (`authMiddleware`)

Nằm tại `BE/src/middlewares/auth.ts`. Nhiệm vụ của nó là chắn cửa mọi API cần đăng nhập.

- **Cách tách token:** Đọc `req.header("authorization")`. Cắt bỏ chữ `"bearer "` để lấy chuỗi token gốc.
- **Kiểm tra User:** Dùng token khởi tạo `createUserScopedClient(token)`, gọi `getUser()`.
- **Tra cứu `nguoidung`:** Dùng email của user query bảng `nguoidung` (chạy bằng `supabaseAdmin` để bỏ qua RLS vì lúc này chưa có role).
- **Khóa tài khoản:** Nếu `profile.trangthai === "NGHI_VIEC"`, middleware văng lỗi `403 Forbidden` ("User account is disabled").
- **Gắn req.user:** Nếu mọi thứ hợp lệ, khởi tạo một object `AuthUser` gồm `{ authId, mand, tendangnhap, email, vaitro }` và gán vào `req.user`.

**Mở rộng Express Type:**
Backend có khai báo type `AuthUser` đè vào `Request` của Express. Do đó các route phía sau có thể dễ dàng gọi `req.user.vaitro` hoặc `req.user.mand`.

---

## 6. Middleware phân quyền (`requireRole`)

Nằm tại `BE/src/middlewares/rbac.ts`.

- **Cách hoạt động:** Là một hàm bọc (currying function) nhận vào một danh sách các role hợp lệ. Ví dụ: `requireRole("ADMIN")`.
- **Logic:** Lấy `req.user` (đã được `authMiddleware` tiêm vào trước đó). Kiểm tra xem `req.user.vaitro` có nằm trong danh sách truyền vào không.
- **Kết quả:** Nếu có -> gọi `next()` cho đi tiếp. Nếu không -> văng `403 Forbidden` (`Role WORKER is not allowed`).
- **Gắn vào route (`BE/src/routes/index.ts`):** 
  - Các route admin: `apiRouter.use("/admin/*", authMiddleware, requireRole("ADMIN"))`
  - Các route worker: `apiRouter.use("/worker/*", authMiddleware, requireRole("WORKER"))`
- **Tính bảo mật:** Với các route admin đã gắn requireRole("ADMIN"), WORKER sẽ bị chặn và nhận 403 Forbidden.

---

## 7. Frontend gắn JWT vào API request

File xử lý chính: `FE/src/lib/api.ts` (Hàm `apiFetch`).

- **Hoạt động:** Hàm này là wrapper bọc ngoài `fetch()` mặc định của trình duyệt.
- **Lấy token:** Nó gọi `getSupabaseClient().auth.getSession()` để moi JWT ra khỏi Local Storage.
- **Gắn token:** Nếu có `access_token`, nó tự động thêm vào object Headers: `headers.set("Authorization", "Bearer " + token)`.
- **Rewrite URL:** Nó có hàm `buildApiUrl`. Chạy trên trình duyệt, nó gọi `/api/*`. Next.js proxy cái này tới port của Express Backend (giải quyết lỗi CORS cho Mobile chạy qua mạng LAN).

---

## 8. Phân luồng sau đăng nhập

File xử lý: `FE/src/app/login/page.tsx` (cuối hàm `handleLogin`).

- Backend (`/api/auth/me`) trả về object có chứa trường `vaitro`.
- **ADMIN:** Bị đẩy thẳng vào `router.push("/admin/vat-tu")`. Layout `/admin` sẽ load menu dành cho Admin.
- **WORKER:** Bị đẩy vào `router.push("/worker")`. Layout `/worker` thiết kế theo chuẩn Mobile-first.
- **Tài khoản nghỉ việc / Không có trong `nguoidung`:** Ngay từ lúc gọi API `/auth/me`, Backend văng lỗi 403. Giao diện Login sẽ bắt `catch`, hiển thị đỏ thông báo "User account is disabled" hoặc "User profile not found", **không cho phép vào hệ thống**.

---

## 9. Các bảng database liên quan

### Bảng `public.nguoidung`
- `mand` (PK): Mã số người dùng, tự tăng. Foreign key cho các bảng khác (VD: `nguoiduyet` trong hóa đơn).
- `tendangnhap`: Unique. Tên để user gõ lúc đăng nhập.
- `hoten`, `sdt`: Thông tin liên lạc.
- `vaitro`: Kiểu Enum (`vai_tro` = 'ADMIN', 'WORKER'). Cốt lõi của RBAC.
- `trangthai`: Kiểu Enum (`trang_thai_nd` = 'DANG_LAM', 'NGHI_VIEC'). Để khóa mõm account bị sa thải.

### Bảng `public.yeucaucapquyen`
- Chứa đơn xin cấp tài khoản của thợ mới. 
- Cột `trangthai` (PENDING, APPROVED, REJECTED). 
- Khi duyệt, tạo user và lưu ID người duyệt vào cột `nguoiduyet`.

### Schema `auth.users`
- Bảng cốt lõi của Supabase, không nằm ở schema `public`.
- Chứa email, encrypted_password, last_sign_in_at.
- Chúng ta không SELECT/UPDATE bảng này bằng query SQL thông thường, mà thao tác qua API `supabaseAdmin.auth.admin`.

---

## 10. Các API liên quan đến auth

| API | Method | Chức năng | File route | Hàm/Service xử lý | Cần JWT? | Role |
| --- | ------ | --------- | ---------- | ----------------- | -------- | ---- |
| `/api/auth/me` | GET | Lấy profile user hiện tại | `auth.routes.ts` | Trực tiếp trong route | Có | Mọi role |
| `/api/auth/ensure-profile` | POST | Đảm bảo Master Admin tồn tại | `auth.routes.ts` | Trực tiếp trong route | Có | Mọi role |
| `/api/auth/request-access` | POST | Gửi đơn xin cấp quyền | `access-requests.routes.ts` | `accessRequestsService.create` | Không | Công khai |
| `/api/admin/access-requests` | GET | List đơn xin quyền | `access-requests.routes.ts` | `accessRequestsService.list` | Có | ADMIN |
| `/api/admin/access-requests/:id/approve`| POST| Duyệt/Từ chối quyền | `access-requests.routes.ts` | `accessRequestsService.update` | Có | ADMIN |
| `/api/admin/users` | GET, POST | QL/Tạo tài khoản nhân viên | `users.routes.ts` | `usersService.create` / `list` | Có | ADMIN |
| `/api/admin/users/:id/action`| PATCH | Khóa user, Đổi mật khẩu | `users.routes.ts` | `usersService.update` | Có | ADMIN |

---

## 11. Các lỗi thường gặp và cách xử lý

- **Sai tên đăng nhập / mật khẩu:** Frontend gọi Supabase. Supabase trả error. Trang Login hiện alert "Lỗi đăng nhập: Sai tài khoản hoặc mật khẩu".
- **Tài khoản có trong Supabase Auth nhưng chưa có trong `nguoidung`:** Xảy ra nếu DB `nguoidung` bị xóa nhầm. Khi gọi Backend, `authMiddleware` văng 403 "User profile not found in nguoidung". Không vào được hệ thống.
- **Tài khoản bị nghỉ việc:** Middleware kiểm tra `profile.trangthai === "NGHI_VIEC"`. Trả 403 "User account is disabled".
- **WORKER cố truy cập route ADMIN:** Backend chạy qua `authMiddleware` thành công. Tới `requireRole("ADMIN")`, văng lỗi 403 "Role WORKER is not allowed". Trả về HTTP 403. FE sẽ bắt lỗi qua `ApiError`.
- **Token hết hạn:** `supabase.auth.getUser()` trả về error. Middleware văng 401 "Invalid or expired token".

---

## 12. Flow (Luồng) dạng Text cho Slide

### Flow 1: Đăng nhập thành công
```text
User nhập email/password
→ Supabase Auth xác thực (Kiểm tra Hash)
→ Supabase cấp access_token (JWT) cho Frontend
→ Frontend đính kèm JWT, gọi API /api/auth/me
→ Backend giải mã JWT, verify với Supabase
→ Backend Query bảng nguoidung lấy Vai trò
→ Frontend nhận Vai trò → Redirect sang Admin/Worker Layout
```

### Flow 2: Bảo vệ Route bằng Middleware (VD: Worker gọi API)
```text
Worker bấm "Hoàn thành cắt"
→ Gọi POST /api/worker/cutting-plans/complete
→ Gửi Header: [Authorization: Bearer <token>]
→ authMiddleware: Đọc Token → Validate → Lấy req.user
→ requireRole("WORKER"): Check req.user.vaitro == "WORKER"
→ Hợp lệ → Chạy Service cắt phôi → Trả kết quả
```

---

## 13. Nội dung Slide đề xuất (Để Thuyết Trình)

### Slide 1: Cơ chế Xác thực và Phân quyền (Auth & RBAC)
**Nội dung trên slide:**
- Quản lý danh tính (Identity): Sử dụng **Supabase Auth** (BaaS) chịu trách nhiệm mã hóa, lưu trữ mật khẩu và xác thực tài khoản theo cơ chế bảo mật của Supabase.
- Xác thực Stateless: Giao tiếp Frontend - Backend qua **JSON Web Token (JWT)**.
- Quản lý Hồ sơ: Bảng `nguoidung` kiểm soát Trạng thái (`DANG_LAM`, `NGHI_VIEC`) và Vai trò (`ADMIN`, `WORKER`).
- Middleware 2 lớp: `authMiddleware` (Kiểm tra tính hợp lệ JWT) + `requireRole` (Phân quyền truy cập API).

**Điều nên nói khi thuyết trình:**
*"Hệ thống của em không tự mã hóa hay lưu mật khẩu ở Backend mà ủy quyền cho Supabase Auth xử lý. Nhờ vậy tránh được rủi ro lộ lọt mật khẩu. Khi đăng nhập, Supabase sẽ cấp 1 mã JWT. Mọi thao tác sau đó, Frontend đều gửi JWT này lên Backend. Backend qua 2 lớp Middleware sẽ kiểm tra chữ ký token và phân quyền chặt chẽ trước khi cho phép vào CSDL."*

### Slide 2: Bảo mật Mobile-First cho Xưởng
**Nội dung trên slide:**
- Request từ điện thoại của Thợ → Gọi về chung 1 nguồn qua cơ chế Next.js Proxy Rewrite `/api/*`.
- Chống CORS, bảo vệ Endpoints.
- Không có JWT → Bị chặn tức khắc ở tầng Middleware (Error 401).
- Vượt quyền (Thợ gọi API Quản lý) → Chặn (Error 403).

---

## 14. 15 Câu hỏi phản biện từ Giáo viên (và cách trả lời)

1. **Vì sao em không tự mã hóa mật khẩu bằng Bcrypt mà phải dùng Supabase Auth?**
   *Đáp:* Để giảm rủi ro bảo mật (tấn công brute-force, rò rỉ CSDL). Supabase Auth là hệ thống chuẩn công nghiệp, an toàn hơn tự code. *(Không cần mở file)*
2. **JWT của em do ai sinh ra? Sinh ra khi nào?**
   *Đáp:* Do máy chủ Supabase sinh ra ngay khi người dùng gõ đúng email/password ở form Đăng nhập.
3. **Mật khẩu người dùng được lưu ở bảng nào?**
   *Đáp:* Lưu ở schema nội bộ `auth.users` của Supabase, em không lưu trong bảng `public.nguoidung`. *(Mở Table Editor Supabase, chỉ ra sự khác biệt)*
4. **Bảng `nguoidung` của em có ý nghĩa gì khi Supabase đã có Auth?**
   *Đáp:* Supabase Auth chỉ làm nhiệm vụ đăng nhập. Bảng `nguoidung` của em dùng để lưu các trường nghiệp vụ: Vai trò ADMIN/WORKER, trạng thái Nghỉ việc, Số điện thoại để hệ thống phần mềm hoạt động.
5. **Backend của em kiểm tra JWT bằng cách nào?**
   *Đáp:* Backend đọc Header Authorization, lấy token rồi gọi hàm `supabase.auth.getUser()` để Supabase xác minh chữ ký. *(Mở `BE/src/middlewares/auth.ts`)*
6. **Làm sao Backend biết user nào gọi API mà phân quyền?**
   *Đáp:* Sau khi verify token, Backend lấy được ID và Email. Từ đó em Query vào bảng `nguoidung` để lôi ra cột `vaitro` và gán vào `req.user`. *(Mở `auth.ts` dòng 34-66)*
7. **Nếu 1 Worker cố tình dùng Postman gọi API xóa đơn hàng của Admin thì sao?**
   *Đáp:* Request có JWT hợp lệ nên lọt qua được `authMiddleware`, nhưng sẽ bị chặn đứng bởi `requireRole("ADMIN")` vì vai trò của họ là WORKER. Kết quả trả về 403 Forbidden. *(Mở `BE/src/middlewares/rbac.ts`)*
8. **Khi token hết hạn thì Backend trả mã lỗi nào?**
   *Đáp:* Trả mã lỗi HTTP 401 Unauthorized.
9. **Nếu nhân viên nghỉ việc thì em xử lý tài khoản thế nào?**
   *Đáp:* Em đổi trạng thái trong bảng `nguoidung` thành `NGHI_VIEC`. Trong Backend `auth.ts`, dòng 55, nếu check thấy `NGHI_VIEC` sẽ văng lỗi ngay lập tức, vô hiệu hóa quyền truy cập. Đồng thời gọi API update ban_duration trên Supabase.
10. **Frontend lưu JWT ở đâu? Khi gọi API gắn vào bằng cách nào?**
    *Đáp:* SDK Supabase tự quản lý token (thường ở localStorage). Khi gọi API, hàm `apiFetch` của em tự lấy token bằng `getSession()` và nhét vào header `Authorization: Bearer...`. *(Mở `FE/src/lib/api.ts`)*
11. **Quy trình xin cấp quyền tài khoản cho thợ diễn ra như thế nào?**
    *Đáp:* Thợ gửi đơn → Lưu vào bảng `yeucaucapquyen` (PENDING). Admin duyệt → Backend tự sinh password ngẫu nhiên → Tạo user Supabase Auth → Insert bảng `nguoidung` → Gửi email thông báo cho thợ. *(Mở `access-requests.service.ts`)*
12. **Master Admin xử lý thế nào nếu lỡ xóa trắng bảng CSDL `nguoidung`?**
    *Đáp:* Em có API `/api/auth/ensure-profile`. Khi đăng nhập bằng email Giám đốc gốc, nếu bảng trống, nó sẽ tự động Upsert lại tài khoản Giám đốc, đảm bảo hệ thống không bị "khóa chết". *(Mở `auth.routes.ts`)*
13. **Vì sao Frontend không nên gọi trực tiếp CSDL mà phải qua Backend API?**
    *Đáp:* Vì gọi Backend API cho phép em chạy các luồng nghiệp vụ phức tạp, ghi logs, kiểm tra Role tập trung, và giấu kín các biến môi trường nhạy cảm khỏi trình duyệt.
14. **Giả sử Supabase bị sập thì hệ thống em có đăng nhập được không?**
    *Đáp:* Không ạ, vì hệ thống phụ thuộc vào Identity Provider của họ. Đây là đặc điểm của kiến trúc BaaS.
15. **Hệ thống có tự động Refresh Token không?**
    *Đáp:* Có, SDK Supabase Client ở Frontend được tích hợp sẵn cơ chế auto-refresh JWT ngầm khi token sắp hết hạn.

---

## 15. Đánh giá Điểm mạnh, Hạn chế & Hướng phát triển

### Điểm mạnh
- Kiến trúc Auth rất chuẩn mực, dùng dịch vụ chuyên nghiệp (Supabase) thay vì tự chế "lăn bánh xe".
- Tách biệt rõ ràng Auth Layer (`auth.users`) và Business Layer (`public.nguoidung`).
- Middleware Backend viết rất chặt, kết hợp cả Authentication (`auth.ts`) và RBAC (`rbac.ts`).
- Xử lý tốt các edge-cases: Tài khoản bị vô hiệu hóa (NGHI_VIEC), auto tạo Master Admin.

### Hạn chế (Điểm trừ cần cải thiện)
- **Hạn chế 1 (Frontend):** Dù Backend đã chuẩn hóa 100% qua API, trang Worker Dashboard (`worker/page.tsx`) hiện tại vẫn còn sử dụng Supabase Client truy vấn trực tiếp CSDL ở một số chỗ. Điều này dựa vào Row Level Security (RLS) của Supabase thay vì đi qua Backend Express (bỏ qua middleware `rbac.ts` tự viết).
- **Hạn chế 2 (Custom Claims):** Backend mỗi lần chạy Middleware phải query lại bảng `nguoidung` để lấy Role. Hơi tốn 1 query (latency).

### Hướng phát triển
1. **Đồng bộ Custom Claims:** Dùng Trigger PostgreSQL đẩy thẳng cột `vaitro` vào JWT Claims của Supabase Auth. Khi đó Backend chỉ cần đọc JWT là biết Role, không cần SELECT CSDL ở Middleware nữa.
2. **Xóa bỏ hoàn toàn truy vấn trực tiếp ở Frontend:** Cập nhật lại Worker Dashboard để fetch data bằng endpoint Express (VD: `/api/worker/dashboard`) thay vì dùng Supabase Client.
3. **Thêm hệ thống Audit Log:** Lưu lại bảng `lich_su_dang_nhap` ghi nhận IP và thiết bị đăng nhập để rà soát bảo mật.
