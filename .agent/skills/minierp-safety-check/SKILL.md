---
name: minierp-safety-check
description: >
  Dùng để chặn các thao tác nguy hiểm lên DB, RPC, Auth, Migration, flow trừ kho, và completePlan.
version: 1.0.0
domain: software_engineering
updated: 2026-05-27
author: MiniERP_NhomKinh_AI_Agent
---

# MiniERP Safety Check

## Vai trò
Agent Security/DBA: Đóng vai trò rào chắn cuối cùng, ngăn chặn các hành động phá hủy dữ liệu hoặc can thiệp sai nghiệp vụ.

## Đầu vào
### Bắt buộc
- Task chuẩn bị thực thi có đụng đến: DB, Migration, RPC, flow trừ kho, `completePlan`, Auth.

## Đầu ra
- Lệnh Dừng (Stop) hoặc Lệnh Cho phép (Proceed) dựa trên yêu cầu có duyệt hay chưa.

## Quy trình

### Bước 1: Quét Database / Migration
Action:
- Kiểm tra task có yêu cầu chạy migration, rollback, drop, truncate, delete thật không.
Verify:
- Đã được người dùng duyệt chưa? (Chưa -> STOP).

### Bước 2: Quét RPC / Logic Nhạy Cảm
Action:
- Kiểm tra task có yêu cầu sửa `approve_cutting_proposal`, `reject_cutting_proposal`, `completePlan` không.
Verify:
- Đã được người dùng duyệt chưa? (Chưa -> STOP).

### Bước 3: Quét Phân Quyền (Worker vs Admin)
Action:
- Kiểm tra xem task có cho phép Worker sửa sơ đồ chính thức không. FE không gửi adminId, workerId, role, score, metrics, kerf, utilization, waste. Backend không tin client.
Verify:
- Cấm tuyệt đối (STOP).

### Bước 4: Quét API Payload (FE -> BE)
Action:
- Kiểm tra FE có gửi các trường: `adminId`, `workerId`, `role`, `score`, `metrics`, `kerf`, `utilization`, `waste` không.
Verify:
- Cấm tuyệt đối (STOP).

### Bước 5: Đưa ra Quyết định
Action:
- Yêu cầu người dùng duyệt (Approval) nếu chưa có.
Verify:
- Không thực hiện bất kỳ lệnh sửa code nào.

## Quy tắc

### MUST
- Phải yêu cầu người dùng xác nhận rõ ràng trước khi đổi logic DB/RPC/Trừ kho.
- Phải dùng Service Role cẩn thận, không để lọt key ra Frontend.

### MUST NOT
- KHÔNG chạy migration 14 (đã deprecated).
- KHÔNG sửa migration 15 nếu chưa được duyệt.
- KHÔNG sửa RPC/completePlan/flow trừ kho nếu chưa được duyệt.
- KHÔNG tự pass cuối.

## Ví dụ

### Input
```text
Task: Sửa RPC approve_cutting_proposal để cho Worker tự duyệt.
```

### Output
```text
[STOP] 
Vi phạm Safety Check: Worker không được phép tự duyệt proposal. Việc sửa RPC này phá vỡ RBAC. Yêu cầu hủy bỏ hoặc xác nhận lại từ Admin.
```

## Xử lý lỗi
- Nếu vô tình thực thi lệnh nguy hiểm, lập tức dừng mọi hành động tiếp theo.
- Báo rõ lệnh đã chạy, thời điểm chạy, output/error nếu có.
- Không tự rollback, reset, revert, drop, delete hoặc sửa tiếp nếu chưa được user duyệt.
- Nếu không chắc thao tác có an toàn hay không, chọn STOP và hỏi user.

## Ghi chú
- Skill này là "vùng cấm". Agent phải rụt rè khi đụng vào đây.
