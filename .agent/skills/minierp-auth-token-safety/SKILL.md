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

### 1. Nhận diện phạm vi Auth

Action: Kiểm tra task có đụng Supabase Auth, password, token, refresh token, session, cookie, service role key, hoặc Auth Admin API không.

Verify: Nếu có bất kỳ mục nào ở trên, chuyển sang skill này trước khi làm tiếp.

### 2. Xác định nhu cầu token

Action: Xác định cần token để test API, test RBAC, hay debug session.

Verify: Ghi rõ cần token của role nào: `ADMIN`, `WORKER`, hoặc user khác.

### 3. Ưu tiên cách lấy token an toàn

Action: Ưu tiên user tự đăng nhập trên UI/dev tool rồi cung cấp token tạm, hoặc dùng session/token đã có sẵn trong dev flow.

Verify: Không reset password và không dùng Auth Admin API nếu chưa có duyệt riêng.

### 4. Xin duyệt nếu cần Auth mutation

Action: Nếu cần reset password, đổi email, đổi metadata, revoke session, hoặc dùng Supabase Auth Admin API, dừng và hỏi user duyệt riêng.

Verify: Chỉ tiếp tục khi user xác nhận rõ hành động, tài khoản, môi trường, và phạm vi.

### 5. Bảo vệ secret/token

Action: Không in token, password, service role key, anon key đầy đủ, refresh token, cookie, hoặc header Authorization ra log.

Verify: Nếu cần báo cáo, chỉ dùng dạng masked như `eyJ...abc`.

### 6. Kiểm soát file tạm

Action: Nếu bắt buộc tạo file chứa token, xin user duyệt riêng và đặt ngoài repo hoặc xóa ngay sau test.

Verify: Báo rõ path file tạm và trạng thái đã xóa/chưa xóa.

### 7. Handoff an toàn

Action: Báo cáo Auth có bị mutate không, token có được tạo/lưu không, file tạm nào còn lại, và rủi ro còn tồn tại.

Verify: Không tự tuyên bố pass cuối; tester/reviewer xác nhận.

## Quy tắc

### MUST

- MUST dùng skill này khi task đụng Supabase Auth, password, token, session, cookie, service role key, hoặc Auth Admin API.
- MUST hỏi user duyệt riêng trước khi reset password hoặc dùng Auth Admin API để mutate Auth.
- MUST ưu tiên user tự đăng nhập để lấy token tạm.
- MUST che token/secret/password/key trong log.
- MUST báo rõ tài khoản nào bị tác động nếu có Auth mutation.
- MUST báo rõ file token tạm nào được tạo và còn tồn tại hay không.
- MUST dừng ngay nếu phát hiện token/secret/password bị in ra log.

### MUST NOT

- MUST NOT tự đổi password Auth user.
- MUST NOT tự reset password qua Supabase Admin API.
- MUST NOT tự dùng service role key để mutate Auth.
- MUST NOT lưu access token hoặc refresh token trong repo workspace nếu chưa được duyệt riêng.
- MUST NOT commit token, password, cookie, hoặc key.
- MUST NOT in đầy đủ token, password, service role key, anon key, hoặc Authorization header.
- MUST NOT coi reset password là an toàn chỉ vì đang ở dev/staging.
- MUST NOT mở rộng phạm vi từ DB runtime test sang Auth mutation nếu user chưa duyệt riêng.

## Ví dụ

### Input

Cần runtime test API Admin/Worker nhưng chưa có token.

### Output

Dừng lại và hỏi user:

```text
Task này cần token Admin/Worker để test API.

Bạn muốn:
1. Tự đăng nhập UI rồi gửi token tạm đã mask/hoặc nhập vào terminal cục bộ, hay
2. Duyệt riêng việc reset password Auth user dev để lấy token?

Tôi sẽ không tự reset password, không dùng Auth Admin API, và không lưu token vào repo nếu chưa được duyệt riêng.
```

## Xử lý lỗi

- Nếu đã lỡ đổi password Auth user: dừng ngay, báo tài khoản bị đổi, thời điểm, phương pháp đổi, và không đổi tiếp nếu chưa được user duyệt.
- Nếu đã lỡ lưu token vào file: dừng ngay, báo path file, yêu cầu xóa file, không in token.
- Nếu token/secret/password đã bị lộ log: dừng ngay, khuyến nghị revoke token, reset password, hoặc rotate key theo mức độ rủi ro.
- Nếu không lấy được token: không bypass bằng service role key; hỏi user cung cấp token hoặc duyệt phương án khác.

## Ghi chú

Skill này không thay thế `minierp-safety-check`.

Dùng `minierp-safety-check` cho DB/RPC/migration/stock/RBAC rủi ro cao.

Dùng skill này cho Auth/password/token/session/service role key.
