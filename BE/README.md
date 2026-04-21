# MiniERP Backend

API cho MiniERP Nhôm Kính Chí Thành. Built with **Express 4 + TypeScript + Supabase**.

## Kiến trúc nhanh

```
BE/
├─ src/
│  ├─ config/        # Env parsing (zod)
│  ├─ lib/           # Shared helpers (supabase client, logger, http, asyncHandler)
│  ├─ middlewares/   # auth, rbac, validate, error, requestContext
│  ├─ modules/       # Feature modules (routes + controller + service + schema)
│  │  ├─ health/
│  │  ├─ auth/              # /api/auth/*
│  │  ├─ access-requests/   # /api/admin/access-requests
│  │  ├─ assignments/       # /api/admin/assignments
│  │  ├─ bootstrap/         # /api/admin/seed, /api/seed
│  │  ├─ categories/        # /api/admin/categories
│  │  ├─ materials/         # /api/admin/materials, /api/admin/materials-options
│  │  ├─ orders/            # /api/admin/orders, /api/admin/orders-list
│  │  ├─ raw-stock/         # /api/admin/raw-stock + /api/worker/raw-stock
│  │  ├─ users/             # /api/admin/users
│  │  └─ worker-tasks/      # /api/worker/tasks
│  ├─ routes/        # Top-level router combining all modules
│  ├─ types/         # Global type augmentations
│  ├─ app.ts         # Express app factory
│  └─ server.ts      # Entry point + graceful shutdown
├─ package.json
├─ tsconfig.json
└─ .env.example
```

Mô hình mỗi module: `*.routes.ts` → `*.service.ts` (chạm DB), kèm `*.schema.ts` khi có validate đầu vào.

## Chạy local

```bash
cd BE
cp .env.example .env     # rồi điền SUPABASE_URL / KEY
npm install
npm run dev              # tsx watch, reload khi đổi file
```

Server mặc định ở `http://localhost:4000`.
Health check: `GET /api/health`
DB probe: `GET /api/health/db`

## Build production

```bash
npm run build
npm start                # chạy dist/server.js
```

## Auth

Client gọi API phải gửi JWT của Supabase trong header:

```
Authorization: Bearer <supabase_access_token>
```

Middleware `authMiddleware` sẽ:
1. Verify JWT với Supabase.
2. Lấy `nguoidung.mand` + `vaitro` vào `req.user`.
3. Các route gắn `requireRole("ADMIN")` / `requireRole("WORKER", "ADMIN")` để kiểm quyền.

## Endpoints đã có

| Method | Path                              | Role          | Mô tả                              |
|--------|-----------------------------------|---------------|------------------------------------|
| GET    | `/api/health`                     | public        | Liveness                           |
| GET    | `/api/health/db`                  | public        | Supabase ping                      |
| POST   | `/api/auth/ensure-profile`        | authenticated | Upsert hồ sơ master admin          |
| GET    | `/api/auth/me`                    | authenticated | Hồ sơ đăng nhập hiện tại           |
| POST   | `/api/auth/request-access`        | public        | Gửi yêu cầu xin cấp tài khoản      |
| GET    | `/api/admin/access-requests`      | ADMIN         | Danh sách yêu cầu cấp quyền        |
| PATCH  | `/api/admin/access-requests/:id`  | ADMIN         | Duyệt hoặc từ chối yêu cầu         |
| GET    | `/api/admin/assignments`          | ADMIN         | Danh sách phân công                |
| POST   | `/api/admin/assignments`          | ADMIN         | Tạo phân công                      |
| PATCH  | `/api/admin/assignments/:id`      | ADMIN         | Cập nhật trạng thái phân công      |
| DELETE | `/api/admin/assignments/:id`      | ADMIN         | Xóa phân công                      |
| GET    | `/api/admin/categories`           | ADMIN         | Danh sách danh mục                 |
| POST   | `/api/admin/categories`           | ADMIN         | Tạo                                |
| PATCH  | `/api/admin/categories/:id`       | ADMIN         | Cập nhật                           |
| DELETE | `/api/admin/categories/:id`       | ADMIN         | Xoá                                |
| GET    | `/api/admin/materials`            | ADMIN         | Danh sách vật tư                   |
| POST   | `/api/admin/materials`            | ADMIN         | Tạo vật tư                         |
| PATCH  | `/api/admin/materials/:id`        | ADMIN         | Cập nhật vật tư                    |
| DELETE | `/api/admin/materials/:id`        | ADMIN         | Xóa vật tư                         |
| GET    | `/api/admin/materials-options`    | ADMIN         | Option gọn cho dropdown            |
| GET    | `/api/admin/orders`               | ADMIN         | Danh sách đơn hàng                 |
| POST   | `/api/admin/orders`               | ADMIN         | Tạo đơn hàng + chi tiết BOM        |
| PATCH  | `/api/admin/orders/:id`           | ADMIN         | Đổi trạng thái đơn hàng            |
| DELETE | `/api/admin/orders/:id`           | ADMIN         | Xóa đơn hàng                       |
| GET    | `/api/admin/orders-list`          | ADMIN         | Danh sách đơn hàng rút gọn         |
| GET    | `/api/admin/raw-stock`            | ADMIN         | Danh sách phôi                     |
| GET    | `/api/admin/raw-stock/:id`        | ADMIN         | Chi tiết phôi                      |
| POST   | `/api/admin/raw-stock`            | ADMIN         | Nhập lô mới (tạo lonhap + N phôi)  |
| PATCH  | `/api/admin/raw-stock/:id`        | ADMIN         | Cập nhật                           |
| DELETE | `/api/admin/raw-stock/:id`        | ADMIN         | Xoá                                |
| GET    | `/api/admin/seed`                 | token-protected | Bootstrap master admin          |
| GET    | `/api/admin/users`                | ADMIN         | Danh sách nhân sự                  |
| POST   | `/api/admin/users`                | ADMIN         | Tạo tài khoản nhân sự              |
| PATCH  | `/api/admin/users/:id`            | ADMIN         | Đổi trạng thái / mật khẩu          |
| GET    | `/api/worker/raw-stock`           | WORKER, ADMIN | Liệt kê phôi                       |
| POST   | `/api/worker/raw-stock/cut`       | WORKER, ADMIN | Ghi nhận 1 lần cắt + log nhatkygiacong |
| GET    | `/api/worker/tasks`               | WORKER, ADMIN | Việc của chính worker đó           |
| PATCH  | `/api/worker/tasks/:id`           | WORKER, ADMIN | Đổi trạng thái phân công           |
| GET    | `/api/seed`                       | public        | Endpoint cũ, trả về 410            |

## Chuẩn response

```jsonc
// OK
{ "ok": true, "data": { /* ... */ } }

// Error
{ "ok": false, "error": "message", "details": [], "requestId": "abc123" }
```

## Ghi chú

- FE đã được tách khỏi `src/app/api` và gọi BE trực tiếp qua `NEXT_PUBLIC_API_BASE_URL`.
- Nếu muốn test protected endpoints, cần lấy Supabase access token thật và gửi header:
  `Authorization: Bearer <token>`.
- Các bước nên làm tiếp:
  - Thêm integration tests (vitest + supertest)
  - Thêm OpenAPI/Swagger
  - Bổ sung repository/mappers nếu service layer tiếp tục lớn lên
