---
name: minierp-codebase-map
description: Dùng để đọc tổng quan codebase MiniERP theo cách tiết kiệm token và tạo bản đồ dự án ngắn trước khi làm task lớn.
version: 1.0.0
domain: software_engineering
updated: 2026-05-28
author: MiniERP_NhomKinh_AI_Agent
---

# MiniERP Codebase Map

## Vai trò
Agent Architect / Codebase Explorer: Đọc tổng quan dự án, map codebase, tìm luồng hoặc module liên quan để onboarding agent hoặc chuẩn bị cho task lớn một cách tiết kiệm token, đọc rộng nhưng nông.

## Đầu vào
- Yêu cầu tìm hiểu tổng quan kiến trúc, luồng xử lý hoặc một tính năng lớn chưa rõ file.

## Đầu ra
- Bản đồ dự án ngắn gọn chứa các thành phần liên quan đến yêu cầu, flow chính, API/contract và gợi ý file cần đọc tiếp.

## Quy trình

### Bước 1: Xác định phạm vi map
- **Action**: Xác định mục tiêu tìm hiểu (ví dụ: luồng tạo proposal cắt).
- **Verify**: Đảm bảo task này không phải là task nhỏ đã biết rõ file (nếu biết rõ file, dừng lại và dùng `minierp-context-budget` + `minierp-code-change`).

### Bước 2: Đọc tài liệu chuẩn
- **Action**: Đọc file `AGENTS.md` (nếu chưa nắm quy tắc) và `package.json` của root/FE/BE nếu cần nắm dependencies.
- **Verify**: Nắm được các rule core của dự án.

### Bước 3: Tìm kiếm FE (Frontend)
- **Action**: Quét các file routes chính trong `FE/src/app` và API client chính như `FE/src/lib/api.ts` liên quan đến nghiệp vụ.
- **Verify**: Không đọc toàn bộ file, chỉ đọc tên file hoặc lướt nhanh để hiểu cấu trúc.

### Bước 4: Tìm kiếm BE (Backend)
- **Action**: Quét thư mục `BE/src/modules` để tìm danh sách module, sau đó xem lướt routes/controllers/services chính của module liên quan.
- **Verify**: Nắm được endpoint, request/response format (contract) liên quan.

### Bước 5: Kiểm tra Database và Scripts
- **Action**: Quét tên file trong `supabase_scripts/` (và đọc nếu thực sự cần) để xem có schema/migration/RPC liên quan không.
- **Verify**: Tuyệt đối không chạy migration hoặc thay đổi file SQL.

### Bước 6: Kiểm tra số lượng file
- **Action**: Đếm số lượng file đã đọc hoặc cần đọc sâu.
- **Verify**: Nếu cần đọc quá 15 file để hiểu tổng quan, phải STOP và xin user duyệt mở rộng scope.

### Bước 7: Xuất báo cáo Codebase Map
- **Action**: Tạo báo cáo bao gồm: Stack tổng quan, FE routes/entry, BE modules, API/contract quan trọng, DB/RPC/migration quan trọng, Flow nghiệp vụ chính, Các file/flow cấm đụng, Gợi ý file cần đọc tiếp.
- **Verify**: Báo cáo phải ngắn gọn, không nhúng code dài dòng. Sau bước này, chuyển sang dùng `minierp-context-budget` + `minierp-code-change`.

## Quy tắc

### MUST
- Phải đọc rộng nhưng nông, không quét toàn bộ nội dung file nếu không cần thiết.
- Phải ưu tiên đọc theo thứ tự: AGENTS.md -> package.json -> FE routes -> FE api -> BE modules -> BE code -> DB/RPC.
- Phải STOP và xin duyệt nếu cần đọc quá 15 file.

### MUST NOT
- KHÔNG dùng cho task nhỏ đã biết cụ thể file cần sửa.
- KHÔNG sửa code trong skill này.
- KHÔNG chạy migration, npm install hoặc bất kỳ lệnh thay đổi môi trường nào.
- KHÔNG đọc nội dung các thư mục/file: `tham-khao/`, `.agent/backup/`, `node_modules/`, `BE/uploads/`, `.next/`, `dist/`, `.git/`, `.env`, logs nội bộ hoặc các token/key bảo mật.
- KHÔNG kết luận pass/fail runtime.

## Ví dụ

**Input**: Map luồng lưu kho sau khi cắt xong.
**Output**: 
- FE Routes: `/worker/cat`
- FE API: `FE/src/lib/api.ts` gọi `POST /api/worker/plan/complete`
- BE Modules: `BE/src/modules/worker/worker.controller.ts`, `worker.service.ts`
- DB/RPC: `complete_plan_and_deduct_stock` (RPC quan trọng, cấm đụng nếu chưa duyệt)
- Gợi ý: Đọc `worker.service.ts` hàm `completePlan` trước tiên.

## Xử lý lỗi
- Nếu bị lạc hướng hoặc mất quá nhiều token để đọc code, dừng ngay lập tức và báo cáo tình trạng cho user.

## Ghi chú
- Đây chỉ là kỹ năng "do thám", sau khi có map, mọi thay đổi code thực tế phải được tiến hành bằng các skill khác.
