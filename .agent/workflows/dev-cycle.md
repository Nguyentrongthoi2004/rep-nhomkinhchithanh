# Developer Cycle Workflow

## Purpose
- Định hình chu trình làm việc khép kín của agent khi tiếp nhận các tác vụ lập trình, kiểm thử và bàn giao để đảm bảo chất lượng, an toàn dữ liệu và tối ưu token context.

## Cycle
1. **Plan**: Phân tích yêu cầu kỹ thuật, vẽ sơ đồ logic/flow, chỉ định các file tối thiểu cần đọc để giải quyết bài toán.
2. **Scope**: Đối chiếu và xác nhận danh sách các file được phép sửa đổi (`allow_edit`), các file cấm sửa (`do_not_edit`) và phân tích rủi ro an toàn DB/Auth.
3. **Change**: Tiến hành sửa đổi code theo hướng tối thiểu, chỉ tập trung giải quyết đúng phạm vi tác vụ, không refactor lan man.
4. **Verify**: Chạy kiểm tra phù hợp với phạm vi thay đổi; nếu chỉ sửa markdown/agent files thì không chạy lint/build. Nếu không chạy test, phải ghi rõ lý do.
5. **Handoff**: Tổng hợp các file đã sửa đổi, kết quả chạy test và các rủi ro tồn đọng để QA/Reviewer xác nhận.

## Stop Conditions
Agent bắt buộc phải **DỪNG LẠI và hỏi ý kiến người dùng** trước khi tiếp tục nếu gặp các tình huống sau:
- Cần sửa đổi Database Schema, RPC, Migration, CompletePlan flow, cơ chế trừ kho hoặc Supabase Auth mà chưa được duyệt riêng.
- Phát hiện cần đọc hoặc sửa đổi các file nằm ngoài phạm vi (scope) được quy định ban đầu.
- Quá trình chạy test phát hiện có nguy cơ tác động hoặc thay đổi dữ liệu thật trên môi trường Production.
- Thiếu các đặc tả API Endpoint hoặc data contract rõ ràng giữa FE và BE.
- Phát hiện các thông tin nhạy cảm (secrets, tokens, passwords) có nguy cơ bị ghi nhận công khai vào log/report.

## Handoff
- Thực hiện cập nhật tài liệu nghiệm thu (`walkthrough.md`, `task.md`) và tóm tắt ngắn gọn các bước tiếp theo cần reviewer kiểm tra trước khi hoàn thành task.
