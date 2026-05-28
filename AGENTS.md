# MiniERP Agent Instructions

Project: Mini-ERP Nhôm Kính.
Stack: Next.js (FE), Express.js (BE), Supabase PostgreSQL (DB).
Roles: ADMIN, WORKER.

## Core Safety Rules (MUST FOLLOW)

- DO NOT mutate production DB.
- DO NOT run migrations unless explicitly approved.
- DO NOT edit migration 15.
- DO NOT edit `completePlan` flow unless approved.
- DO NOT edit RPC `approve_cutting_proposal` / `reject_cutting_proposal` unless approved.
- DO NOT deduct stock on plan creation. Stock is deducted only during completion flow.
- Worker MUST NOT edit official cutting plans.
- FE MUST NOT send `adminId`, `workerId`, `role`, `score`, `metrics`, `kerf`, `utilization`, `waste`.
- Backend MUST get user from auth token/session, DO NOT trust client body.
- AI Agent MUST NOT self-declare final pass. Tester/Reviewer confirms final pass.

## Common Commands

```bash
# Frontend
cd FE && npm run lint && npm run build

# Backend
cd BE && npm run lint && npm run build
```

## Default Workflow & Skill Map

- Mọi task phải tuân thủ `minierp-context-budget`: đọc ít file nhất có thể, không quét toàn repo, không report dài.
- Mọi task bắt đầu bằng `minierp-plan-task`, trừ câu hỏi nhỏ không cần đọc/sửa file.
- Nếu cần hiểu tổng quan dự án, tìm flow/module liên quan, hoặc onboarding agent thì dùng `minierp-codebase-map`; không dùng cho task nhỏ đã biết file.
- Nếu cần thông tin ngữ cảnh dự án (domain context), đọc `.agent/rules/project-context.md`.
- Nếu task cần áp dụng workflow chu trình phát triển chung, tham khảo `.agent/workflows/dev-cycle.md`.
- Nếu cần sửa/review dữ liệu request FE và API BE contract, sử dụng `minierp-payload-contract-check`.
- Nếu được duyệt code thì dùng `minierp-code-change`.
- Nếu test flow thật thì dùng `minierp-runtime-test`.
- Nếu review SQL/schema/RLS/index/RPC/migration thì dùng `minierp-db-review`.
- Nếu đụng DB/RPC/migration/completePlan/stock/Auth/RBAC hoặc có rủi ro mutate dữ liệu thì dùng `minierp-safety-check`.
- Nếu đụng Supabase Auth/password/token/session/service role key thì dùng `minierp-auth-token-safety`.
- Cuối task dùng `minierp-handoff`.
- Chỉ dùng `minierp-graduation-docs` khi chức năng lớn đã pass cuối.

## Resource Optimization Rules

- DO NOT read the entire repository. Read only directly related files.
- DO NOT read `node_modules`, `.next`, `dist`, `build`, `.git`, `tham-khao`, `.agent/backup`, `BE/uploads`.
- DO NOT load every skill by default. Use only the relevant skill for the current task.
- DO NOT repeat lint/build if there are no changes.
- DO NOT paste overly long file outputs in responses. Keep responses short and technical.
- If more files are needed, explain why before reading them.
- If scope expands beyond the original task, stop and ask for approval before continuing.
