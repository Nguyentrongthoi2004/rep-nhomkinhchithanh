---
name: minierp-payload-contract-check
description: Check FE request payloads against BE route/schema/service contracts and MiniERP auth/RBAC safety rules.
version: 1.0.0
domain: frontend_backend_contract
updated: 2026-05-28
author: MiniERP_NhomKinh_AI_Agent
---

# MiniERP Payload Contract Check

## Vai trò
- Agent Contract Reviewer: Xác minh tính nhất quán của dữ liệu (payload/contract) trao đổi giữa FE và BE, đảm bảo tuân thủ nghiêm ngặt các quy tắc an toàn phân quyền (RBAC).

## Đầu vào
- Path của file FE thực hiện gửi request.
- Endpoint và method BE tương ứng.

## Đầu ra
- Báo cáo đối chiếu dữ liệu (OK hoặc FAIL) và các trường thông tin không hợp lệ nếu có.

## Quy trình
1. **Identify Components**:
   - *Action*: Xác định FE caller component, BE route path, schema validation (Zod/Joi DTO) và service handler method.
   - *Verify*: Tất cả các file thành phần đều được tìm thấy, không giả định file ảo.
2. **Read Code Contracts**:
   - *Action*: Đọc file định nghĩa schema của BE (ví dụ `*.schema.ts` hoặc `*.schema.json`) và schema gửi từ FE.
   - *Verify*: Lấy ra danh sách chính xác các trường dữ liệu (fields) và kiểu dữ liệu (types).
3. **Compare Payload**:
   - *Action*: So sánh chi tiết từng trường dữ liệu trong request body mà FE gửi với schema BE mong đợi.
   - *Verify*: Đảm bảo không lệch tên trường (mismatch) hoặc sai kiểu dữ liệu (mã số/chuỗi).
4. **Check Forbidden Fields**:
   - *Action*: Rà soát request body của FE xem có chứa các trường cấm: `adminId`, `workerId`, `role`, `score`, `metrics`, `kerf`, `utilization`, `waste`.
   - *Verify*: Tuyệt đối không được gửi các trường này từ client.
5. **Check Identity Source**:
   - *Action*: Kiểm tra xem controller/service của BE có lấy định danh người dùng (`mand`, `vaitro`) từ session/token không.
   - *Verify*: Đảm bảo BE không tin cậy và không trích xuất thông tin định danh/quyền hạn từ client body.
6. **Evaluate Error Handling**:
   - *Action*: Kiểm tra cách FE xử lý các mã lỗi phản hồi từ BE như 400 (Bad Request), 403 (Forbidden), 409 (Conflict).
   - *Verify*: Đảm bảo UI/UX hiển thị thông báo lỗi thân thiện, không bị crash trắng màn hình.
7. **Report**:
   - *Action*: Kết xuất báo cáo kết quả đối chiếu contract (OK/FAIL), chỉ rõ vị trí cần chỉnh sửa nếu phát hiện lỗi.
   - *Verify*: Báo cáo ngắn gọn, tập trung kỹ thuật, không in thông tin nhạy cảm.

## Quy tắc

### MUST
- Phải xác nhận chính xác endpoint/contract từ source code thật trước khi sửa code hoặc chạy test.
- Phải đồng thời kiểm tra route, schema và service method của BE khi cấu trúc payload của FE thay đổi.
- Phải báo cáo rõ ràng và dừng lại nếu phát hiện endpoint không tồn tại hoặc dữ liệu contract không đồng nhất.
- Phải kiểm tra các trường hợp xử lý lỗi biên (400, 401, 403, 409) ở FE.

### MUST NOT
- KHÔNG được tự ý đoán endpoint hay body của API.
- KHÔNG gửi các trường cấm (`adminId`, `workerId`, `role`, `score`, `metrics`, `kerf`, `utilization`, `waste`) từ FE.
- KHÔNG sửa đổi các file nghiệp vụ nhạy cảm như completePlan, RPC, Migration trong lúc chỉ review contract.
- KHÔNG bypass kiểm tra phân quyền (RBAC) ở BE bằng cách tin cậy thông tin gửi từ client body.

## Ví dụ
- **Input**: "Sửa nút approve proposal ở FE."
- **Output**:
  - FE caller: `FE/src/app/admin/de-xuat-cat/page.tsx`
  - BE route: endpoint approve proposal được xác nhận từ BE route file
  - Expected body: `{ ghichu: string }`
  - Forbidden fields: `adminId`, `role` (Không có trong body) -> OK
  - Auth source: `req.user.mand` từ JWT token -> OK
  - Result: OK (Payload hợp lệ)

## Xử lý lỗi
- Nếu phát hiện FE gửi trường cấm: Báo FAIL, liệt kê chi tiết trường vi phạm và yêu cầu sửa đổi FE.
- Nếu BE đọc ID từ client body: Báo lỗi bảo mật P0, yêu cầu chuyển sang đọc từ JWT token/session.

## Ghi chú
- Kỹ năng này giúp giảm lỗi runtime liên quan đến tích hợp FE ↔ BE.
