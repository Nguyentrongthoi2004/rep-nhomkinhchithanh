---
name: minierp-runtime-test
description: >
  Dùng khi test flow thực tế trên FE/BE/DB để xác nhận lỗi hoặc xác nhận pass.
version: 1.0.0
domain: software_engineering
updated: 2026-05-27
author: MiniERP_NhomKinh_AI_Agent
---

# MiniERP Runtime Test

## Vai trò
Agent Tester: Xác nhận lỗi thực tế qua môi trường chạy, ghi nhận Network/DB, phân loại lỗi.

## Đầu vào
### Bắt buộc
- Mô tả chức năng cần test.
### Tùy chọn
- Môi trường (Dev/Staging).

## Đầu ra
- Báo cáo test (Markdown).
- Network payload ghi nhận được.
- DB snapshot trước/sau (nếu có thao tác mutate).
- Phân loại lỗi P0/P1/P2.

## Quy trình

### Bước 1: Xác nhận môi trường
Action:
- Chắc chắn đang test trên Dev/Staging, không phải Production.
Verify:
- Không thấy URL hay biến môi trường của Prod.

### Bước 2: Chạy Flow Nghiệp Vụ
Action:
- Execute các step trên FE (giả lập hoặc manual) hoặc gọi API BE.
Verify:
- UI không crash đột ngột.

### Bước 3: Ghi nhận Network Payload
Action:
- Inspect payload request/response của API quan trọng.
- Xác nhận dữ liệu đến từ API thật qua Network, server log hoặc DB snapshot.
Verify:
- Không gửi thừa data, không có HTTP 500 bất thường.
- Cấm kết luận pass nếu UI chỉ render dữ liệu hardcode, mock data hoặc stale cache.

### Bước 4: Chụp DB Snapshot (Nếu Mutate)
Action:
- Lấy state của record liên quan trước và sau khi thực hiện.
Verify:
- Dữ liệu rác không bị sinh ra (vd: mồ côi record).

### Bước 5: Kiểm tra RBAC
Action:
- Đảm bảo Worker không chạy được API Admin và ngược lại.
Verify:
- Trả về 403 nếu sai quyền.

### Bước 6: Đánh giá & Phân Loại Lỗi
Action:
- Phân loại lỗi P0, P1, P2.
  - Auth/RBAC (sai quyền hoặc bypass quyền): P0
  - CORS production làm app không dùng được: P0
  - Thiếu token do test setup: Ghi là setup issue, chưa kết luận P0.
Verify:
- Chú ý các keyword nghiệp vụ: Worker Proposal, Admin Proposal, approve_cutting_proposal, reject_cutting_proposal, sodocat/chitietcat, khothanhphoi, completePlan, EXPIRED/stale, RBAC ADMIN/WORKER, và các field cấm (adminId, workerId, role, score, metrics, kerf, utilization, waste).

### Bước 7: Báo cáo
Action:
- Trả về report. Nếu phát hiện lỗi, đề xuất chuyển sang `minierp-code-change`.
Verify:
- KHÔNG sửa code ngay.

## Quy tắc

### MUST
- Phải ghi nhận rõ Network payload (Request body/Response body).
- Phải dừng và chờ yêu cầu trước khi chuyển sang `minierp-code-change`.

### MUST NOT
- KHÔNG sửa code trong lúc runtime test, kể cả khi phát hiện lỗi thật.
- KHÔNG tự mutate DB production.
- KHÔNG chuyển sang `minierp-code-change` nếu chưa có yêu cầu hoặc approval rõ từ user.

## Ví dụ

### Input
```text
Thực hiện test flow Admin duyệt Proposal.
```

### Output
```text
- Môi trường: Dev
- Network Payload:
  - Request: POST /api/proposal/approve { ghichu: "Đồng ý" }
  - Response: 200 OK
- RBAC: Đúng quyền Admin.
- Lỗi phát hiện: Chưa phát hiện lỗi trong phạm vi runtime test đã chạy. Pass cuối do tester/reviewer xác nhận.
```

## Xử lý lỗi
- Nếu DB crash, mất dữ liệu, hoặc phát sinh side effect ngoài flow test: báo P0 và dừng.
- Nếu Auth/RBAC cho phép sai quyền hoặc bypass quyền: báo P0.
- Nếu CORS production làm app không dùng được: báo P0.
- Nếu thiếu token, sai account test, hoặc thiếu dữ liệu seed: ghi là setup issue, chưa kết luận P0.
- Nếu không chắc lỗi thuộc app hay setup test, dừng và hỏi user.

## Ghi chú
- Lint/Build pass chỉ là bề nổi, Runtime Test quyết định ứng dụng có chạy hay không.
