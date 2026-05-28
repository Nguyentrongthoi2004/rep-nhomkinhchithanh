---
name: minierp-plan-task
description: >
  Dùng trước mọi task code/audit/runtime/docs/deploy để phân tích yêu cầu, xác định rủi ro và lập plan.
version: 1.0.0
domain: software_engineering
updated: 2026-05-27
author: MiniERP_NhomKinh_AI_Agent
---

# MiniERP Plan Task

## Vai trò
Agent Planner: Đóng vai trò phân tích yêu cầu, giới hạn phạm vi công việc và phát hiện rủi ro trước khi bắt tay vào code hoặc test.

## Đầu vào
### Bắt buộc
- Yêu cầu hoặc mô tả lỗi từ người dùng.
### Tùy chọn
- Log lỗi, UI bug mô tả.

## Đầu ra
- Trả về response (Markdown) tóm tắt yêu cầu, phân loại task, file cần đọc, phạm vi, rủi ro, và kế hoạch ngắn gọn. Không tạo file.

## Quy trình

### Bước 1: Viết lại yêu cầu kỹ thuật
Action:
- Chuyển đổi ngôn ngữ người dùng thành tác vụ kỹ thuật rõ ràng.
Verify:
- Task đã được hiểu đúng nghiệp vụ MiniERP.

### Bước 2: Phân loại task và Module
Action:
- Gán loại task (FE only, BE only, Full-stack, Database, Runtime test, v.v.).
- Liệt kê các module liên quan.
Verify:
- Không bị nhầm lẫn giữa FE issue và BE issue.

### Bước 3: Chỉ định File cần đọc
Action:
- Liệt kê chính xác đường dẫn file hoặc component cần thiết.
Verify:
- Danh sách ngắn gọn, không load toàn bộ repo.

### Bước 4: Kiểm tra trạng thái Git
Action:
- Chạy `git status --short`, `git diff --stat`, `git diff --name-only`.
Verify:
- Đảm bảo repo đang sạch hoặc biết trước các file đang modified.

### Bước 5: Xác định Phạm vi (Scope)
Action:
- Chốt danh sách file được phép sửa.
- Chốt rõ danh sách các vùng cấm sửa.
Verify:
- Đã cô lập được vùng rủi ro.

### Bước 6: Phân tích Rủi ro (P0/P1/P2)
Action:
- Đánh giá nguy cơ liên quan DB, RPC, Auth, sơ đồ chính thức. Gán nhãn P0, P1, P2.
Verify:
- Các thao tác nguy hiểm (P0) đã được chặn trước bằng lệnh cấm.

### Bước 7: Quyết định (Plan / Dừng lại)
Action:
- Nếu an toàn: Đưa ra kế hoạch các bước làm tiếp theo.
- Nếu rủi ro cao (đụng DB, RPC quan trọng): Yêu cầu người dùng duyệt.
Verify:
- Tuyệt đối không có hành động chỉnh sửa file ở bước này.

## Quy tắc

### MUST
- LUÔN LUÔN thực hiện phân tích scope trước khi gọi tool sửa code.
- Phải dừng và hỏi nếu yêu cầu mâu thuẫn với rules (ví dụ: đòi Worker sửa sơ đồ chính).

### MUST NOT
- KHÔNG thay đổi file code.
- KHÔNG chạy migration hoặc mutate DB.
- KHÔNG load toàn bộ repo.
- KHÔNG sửa RPC, completePlan hoặc flow trừ kho nếu chưa được duyệt.
- KHÔNG tự kết luận pass cuối.

## Ví dụ

### Input
```text
Task: Thêm thông báo khi Admin reject proposal.
```

### Output
```text
- Loại task: Full-stack.
- Module: Admin Proposal, RPC reject.
- File cần đọc: FE/src/app/admin/de-xuat-cat/page.tsx, BE/src/modules/cutting-plans/cutting-plans.service.ts
- Git status: [Đã chạy kiểm tra].
- Phạm vi: Thêm UI toast ở FE, đảm bảo BE reject_cutting_proposal trả đúng error.
- Cấm: Không sửa sơ đồ cắt, không trừ kho.
- Rủi ro: P1 (Quên truyền ghi chú reject).
- Kế hoạch: Đã rõ ràng. Có thể chuyển sang minierp-code-change sau khi user duyệt.
```

## Xử lý lỗi
- Nếu input không đủ thông tin, dừng và đặt câu hỏi ngắn gọn cho người dùng.

## Ghi chú
- Kế hoạch nên thật ngắn gọn, tránh lặp lại luật một cách rườm rà.
