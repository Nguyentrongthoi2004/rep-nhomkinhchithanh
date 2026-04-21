# MiniERP Frontend

Frontend của MiniERP Nhôm Kính Chí Thành, built với Next.js App Router.

## Vai trò của FE

`FE/` chỉ giữ:

- page, layout, component, styling
- client auth với Supabase (`src/lib/supabase/client.ts`)
- API client gọi sang backend riêng (`src/lib/api.ts`)

`FE/` không còn giữ business API routes trong `src/app/api`.

## Chạy local

1. Điền biến môi trường trong `.env.local`
2. Chạy backend ở `../BE`
3. Chạy frontend:

```bash
cd FE
npm install
npm run dev
```

Frontend chạy ở [http://localhost:3000](http://localhost:3000) và gọi backend qua:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Cấu trúc chính

```text
src/
├─ app/                 # page + layout
├─ components/          # shared UI/layout components
├─ lib/
│  ├─ api.ts            # helper fetch + Bearer token
│  └─ supabase/         # browser/server auth clients
```

## Quy ước

- Page/component không query bảng nghiệp vụ trực tiếp từ browser.
- Mọi gọi dữ liệu nghiệp vụ đi qua `apiData()` / `apiJson()`.
- Backend chịu trách nhiệm auth, RBAC, validate, và truy cập Supabase service role.
