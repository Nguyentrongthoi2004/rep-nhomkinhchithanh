---
name: minierp-auth-token-safety
description: Safety workflow for Supabase Auth, passwords, tokens, sessions, and service role key usage.
version: 1.0.0
domain: security
updated: 2026-05-27
author: MiniERP_NhomKinh
---

# minierp-auth-token-safety

## Vai trò

Kiểm soát an toàn khi task đụng Supabase Auth, password, token, session, hoặc service role key.

Skill này dùng để ngăn agent tự ý reset password, lấy token, lưu token, hoặc dùng Auth Admin API vượt phạm vi user duyệt.

## Đầu vào

- Yêu cầu test/login/API cần token.
- Yêu cầu đụng Supabase Auth.
- Yêu cầu dùng admin/worker session.
- Yêu cầu dùng service role key.
- Log lỗi liên quan token/session/password.

## Đầu ra

- Xác định có cần user duyệt riêng không.
- Cách lấy token an toàn.
- Danh sách hành động bị cấm.
- Báo cáo Auth/token có bị mutate hay không.
- Hướng xử lý nếu đã lỡ đổi password hoặc lưu token.

## Quy trình

1. **Nhận diện**
   - Action: Dừng và chuyển sang skill này nếu task đụng Supabase Auth, password, token, session, service role key.
   - Verify: Xác định rõ task chỉ đọc/test hay có mutate Auth.

2. **Ưu tiên an toàn**
   - Action: Ưu tiên user tự đăng nhập UI để lấy token tạm.
   - Verify: Không reset password, không dùng Auth Admin API nếu chưa có duyệt riêng.

3. **Xin duyệt mutation**
   - Action: Nếu bắt buộc reset password, đổi email, tạo user, revoke session hoặc dùng Admin API, hỏi user duyệt riêng.
   - Verify: Có xác nhận rõ ràng của user trước khi thực hiện.

4. **Bảo vệ secret**
   - Action: Mask token/password/service role key trong log và báo cáo, ví dụ `eyJ...abc`.
   - Verify: Không tạo file token trong repo, không in secret đầy đủ ra terminal/report.

5. **Handoff**
   - Action: Báo cáo Auth có bị mutate không, token có được tạo/lưu không, rủi ro còn lại.
   - Verify: Nếu có lộ token hoặc file nhạy cảm, báo path và yêu cầu xóa/rotate.

## Quy tắc

### MUST
- LUÔN hỏi user duyệt riêng trước khi mutate Auth (reset password, dùng Admin API, service role).
- LUÔN che token/secret/password trong log và báo cáo. Dừng ngay nếu lọt log.
- Backend lấy identity từ token/session, không tin client body.
- Ưu tiên user tự đăng nhập để lấy token tạm.

### MUST NOT
- KHÔNG tự reset password Auth user (kể cả trên dev/staging) nếu chưa duyệt.
- KHÔNG tự tạo, sửa, xóa Auth user hoặc revoke session nếu chưa được user duyệt riêng.
- KHÔNG dùng service role key để mutate Auth trái phép.
- KHÔNG lưu token/refresh token vào repo. KHÔNG commit `.env`, `tmp_test`, file token.
- KHÔNG in token/JWT/service role key ra terminal hay report.

## Ví dụ

### Input
Cần test API Admin/Worker nhưng chưa có token.

### Output
Dừng lại hỏi user: 1. Tự đăng nhập lấy token tạm, hay 2. Duyệt việc reset password dev để lấy token? Không tự reset nếu chưa duyệt.

## Xử lý lỗi
- Nếu lỡ đổi password/lưu token/lộ log: DỪNG NGAY. Báo cáo rõ tài khoản, path file, yêu cầu xóa.
- Không bypass bằng service role key nếu thiếu token.

## Ghi chú
Skill này không thay thế `minierp-safety-check`. Dùng `safety-check` cho DB/RPC/Stock.
