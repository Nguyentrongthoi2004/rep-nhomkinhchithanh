---
name: minierp-code-change
description: >
  Dùng khi thực thi task code: sửa đúng phạm vi, không refactor lan, kiểm tra UI/UX, API contract.
version: 1.0.0
domain: software_engineering
updated: 2026-05-27
author: MiniERP_NhomKinh_AI_Agent
---

# MiniERP Code Change

## Vai trò
Agent Coder: Thực thi việc sửa/tạo file code dựa trên plan đã duyệt.

## Đầu vào
### Bắt buộc
- Plan sửa đổi đã được xác nhận ở bước `minierp-plan-task` hoặc user đã duyệt rõ ràng.
### Tùy chọn
- Snippets hoặc tài liệu tham khảo cụ thể.

## Đầu ra
- File đã sửa.
- Logic trước/sau.
- API contract có đổi không.
- DB/migration có đụng không.
- Lint/build đã chạy hoặc lý do chưa chạy.
- Rủi ro còn lại.
- KHÔNG tạo file report riêng, chỉ trả về response.

## Quy trình

### Bước 1: Rà soát Plan
Action:
- Xác nhận lại file nào được phép sửa.
Verify:
- Không sửa lố ra ngoài các file này.

### Bước 2: Sửa đổi (Thực thi)
Action:
- Sử dụng công cụ sửa code.
- Comment các logic nghiệp vụ quan trọng (đặc biệt các phần liên quan đến giá, kho, proposal).
Verify:
- Code không bị lỗi cú pháp lặt vặt. Không xóa nhầm import của code cũ.

### Bước 3: Rà soát API Contract (nếu có)
Action:
- Kiểm tra dữ liệu đầu vào/đầu ra giữa FE và BE.
Verify:
- FE không gửi trường cấm (adminId, score, v.v.). BE đọc đúng từ token.

### Bước 4: Kiểm tra sau khi sửa (Lint/Build)
Action:
- Nếu sửa FE: `cd FE && npm run lint && npm run build`
- Nếu sửa BE: `cd BE && npm run lint && npm run build`
- Nếu sửa cả FE và BE thì chạy cả hai.
- Nếu không chạy được, phải ghi rõ lý do.
Verify:
- Lint/build pass hoặc lỗi được ghi rõ.
- Nếu không chạy được, lý do đã được ghi vào kết quả đầu ra.

### Bước 5: Tự review
Action:
- Kiểm tra xem mình có đang "refactor lan" hay không.
Verify:
- Không format lại code không liên quan đến task.

## Quy tắc

### MUST
- Nếu hiển thị số đo, tỷ lệ hoặc tiền tệ, phải format rõ ràng và tránh NaN/null/undefined.
- Phải bắt các state FE: Loading, Error, Empty.
- Phải dùng đúng wording ("đề xuất điều chỉnh phương án cắt" thay vì "tối ưu mới").

### MUST NOT
- KHÔNG dùng skill này nếu chưa có plan rõ hoặc chưa được user duyệt.
- KHÔNG sửa migration/RPC/completePlan/flow trừ kho nếu chưa được duyệt.
- KHÔNG đổi API contract ngầm.
- KHÔNG xóa comment cũ không liên quan.

## Ví dụ

### Input
```text
Task: Sửa FE để không gửi adminId khi duyệt đề xuất. (Đã có plan)
```

### Output
```text
File đã sửa:
- FE/src/lib/api.ts

Logic trước/sau:
- Trước: Gửi payload `{ adminId, ghichu }`.
- Sau: Chỉ gửi payload `{ ghichu }`.

API contract:
- Không đổi endpoint.
- Payload approve/reject không còn gửi `adminId`.
- BE tự đọc user từ JWT.

DB/Migration:
- Không đụng DB.
- Không đụng migration.
- Không đụng RPC/completePlan/flow trừ kho.

Lint/Build:
- Chưa chạy trong ví dụ này.

Rủi ro còn lại:
- Cần runtime test Admin approve/reject Proposal để xác nhận payload thực tế.
```

## Xử lý lỗi
- Nếu lúc đang code phát hiện file liên quan bị hỏng do dev khác, báo cáo ngay, không tự sửa lan.

## Ghi chú
- Giữ các thay đổi cực kỳ atomic (ngắn gọn, tập trung).
