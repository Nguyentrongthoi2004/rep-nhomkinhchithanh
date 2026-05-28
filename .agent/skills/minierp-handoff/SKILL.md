---
name: minierp-handoff
description: >
  Dùng khi kết thúc task để tóm tắt công việc, cảnh báo rủi ro còn lại và yêu cầu QA duyệt.
version: 1.0.0
domain: software_engineering
updated: 2026-05-27
author: MiniERP_NhomKinh_AI_Agent
---

# MiniERP Handoff

## Vai trò
Agent Reviewer: Báo cáo kết quả công việc, không tự cao, trung thực với rủi ro.

## Đầu vào
### Bắt buộc
- Kết quả của các bước sửa code, lint/build, và self-test.
### Tùy chọn
- Git status sau cùng.
- Runtime test result.
- File diff summary.
- Lỗi còn lại nếu có.

## Đầu ra
- Báo cáo Handoff (Markdown) gửi cho người dùng.

## Quy trình

### Bước 1: Tổng hợp những gì đã làm
Action:
- Liệt kê các file đã tạo, sửa, xóa hoặc move.
Verify:
- Không bịa thêm những việc chưa làm.

### Bước 2: Nêu rõ những gì không đụng tới
Action:
- Xác nhận các khu vực (FE/BE/DB) không bị ảnh hưởng.
Verify:
- Đúng với scope đã cam kết ở bước Plan.

### Bước 3: Tổng hợp kết quả Test
Action:
- Báo cáo kết quả Lint/Build hoặc Runtime test.
Verify:
- Nêu rõ lý do nếu không chạy một lệnh test nào đó.

### Bước 4: Đưa ra rủi ro còn tồn đọng
Action:
- Nêu rõ các rủi ro P1, P2 (ví dụ chưa test trên DB thật, UI chưa responsive).
Verify:
- Không che giấu lỗi.

### Bước 5: Yêu cầu Tester duyệt
Action:
- Nêu các bước cần Tester kiểm tra thủ công.
Verify:
- Agent không tự nhận "Đã pass hoàn toàn".

## Quy tắc

### MUST
- Dùng wording chuẩn xác: "Đã sửa xong trong phạm vi", "Sẵn sàng đưa tester/reviewer kiểm tra", "Pass cuối do tester/reviewer xác nhận".
- Ghi rõ lệnh git status sau cùng (nếu có yêu cầu).

### MUST NOT
- KHÔNG nói "Pass 100%", "Không còn lỗi", "Hoàn thành cuối cùng".
- KHÔNG biến Handoff thành một tài liệu nội bộ dài dòng.

## Ví dụ

### Input
```text
Task code hoàn tất. Lint/build pass. Chuẩn bị báo cáo.
```

### Output
```text
### Handoff Report
1. File đã sửa: `FE/src/lib/api.ts` (Bỏ truyền adminId).
2. File không đụng: Backend, DB, Migration.
3. Test: Lint/Build pass.
4. Rủi ro: P1 - Chưa runtime test API từ worker thật.
5. Sẵn sàng đưa tester/reviewer kiểm tra. Pass cuối do QA xác nhận.
```

## Xử lý lỗi
- Nếu lint/build fail, vẫn phải báo cáo handoff dạng FAIL, ghi rõ lỗi, file liên quan, và chưa sẵn sàng tester/reviewer.

## Ghi chú
- Ngắn gọn, súc tích, đi thẳng vào vấn đề.
