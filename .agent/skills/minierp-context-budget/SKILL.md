---
name: minierp-context-budget
description: Dùng để giới hạn context/token khi agent phân tích, sửa code, test hoặc viết báo cáo trong MiniERP.
version: 1.0.0
domain: software_engineering
updated: 2026-05-28
author: MiniERP_NhomKinh_AI_Agent
---

# MiniERP Context Budget

## Vai trò
Agent Context Manager: Đảm bảo AI hoạt động với lượng context/token tối thiểu, giữ tốc độ nhanh, tiết kiệm RAM/Token và ngăn chặn rủi ro đọc/sửa lan man (anti-over-engineering).

## Đầu vào
- Yêu cầu task (nhỏ gọn, sửa bug nhanh, hoặc cần tiết kiệm token).
- Tên các file cụ thể được user đề cập.

## Đầu ra
- Giải pháp trực tiếp hoặc code sửa đổi (không chứa từ ngữ dư thừa).
- Báo cáo cô đọng gồm tối đa 5 mục.

## Quy trình

### Bước 1: Giới hạn phạm vi (Scope Definition)
Action: Chỉ định danh sách file bắt buộc phải đọc từ yêu cầu của user.
Verify: Đảm bảo không quét toàn bộ dự án (`Get-ChildItem -Recurse` hoặc đọc mọi file trong folder) nếu không có lý do chính đáng.

### Bước 2: Đọc phân cấp (Hierarchical Reading)
Action: Đọc theo thứ tự ưu tiên: file user nêu rõ -> file import trực tiếp -> API/type liên quan -> file test liên quan.
Verify: Dừng việc tìm kiếm và đọc file ngay lập tức khi đã có đủ logic để giải quyết task.

### Bước 3: Áp dụng Moyu (Anti-Scope Creep)
Action: Nếu task chỉ yêu cầu trả lời câu hỏi hoặc lên plan, tuyệt đối không tự chạy lệnh sửa file hoặc cài package.
Verify: Nếu cần mở rộng scope sang file khác, phải giải thích ngắn gọn (1 câu) trước khi làm.

### Bước 4: Nén ngữ cảnh (Context Compression)
Action: Trả lời đi thẳng vào vấn đề (Atomic Precision). Cung cấp code/script thay vì giải thích dài dòng.
Verify: Không in lại (paste) nội dung file hoặc log quá dài vào báo cáo.

### Bước 5: Báo cáo cô đọng (Concise Reporting)
Action: Viết final report theo đúng chuẩn 5 mục.
Verify: Chỉ bao gồm: File sửa, Thay đổi chính, Test đã chạy, Rủi ro còn lại, Bước tiếp theo.

## Quy tắc

### Emergency Brake (Phanh khẩn cấp)
- Nếu task bắt đầu chạm quá 3 file ngoài phạm vi ban đầu, hoặc cần đọc toàn repo/tham-khao/docs lớn, phải STOP, báo lý do, xin duyệt mở rộng scope.

### MUST
- Phải xác định phạm vi file tối thiểu cần đọc trước khi thực thi lệnh.
- Phải dùng văn phong đi thẳng vào vấn đề, loại bỏ các từ đệm như "Dạ vâng", "Tôi sẽ làm ngay", "Theo như yêu cầu".

### MUST NOT
- KHÔNG quét thư mục rác hoặc không liên quan: `tham-khao/`, `.agent/backup/`, `node_modules`, `uploads` trong task thường.
- KHÔNG lặp lại context cũ (như in lại file cấu hình) nếu agent hoặc user đã biết.
- KHÔNG tự tiện đọc các file docs lớn hoặc tìm kiếm diện rộng trừ khi bế tắc hoàn toàn.

## Ví dụ
**Input:** "Sửa lỗi button Đăng Nhập bị lệch."
**Quy trình chuẩn:** Chỉ đọc file `Login.tsx` -> sửa CSS/Tailwind class -> Report đúng 5 mục. Không đọc sang Auth Router hay BE controller.

## Xử lý lỗi
- Nếu bế tắc vì thiếu context: Báo cáo thiếu thông tin ở file nào thay vì tự đoán mò hoặc đọc ngẫu nhiên.
- Nếu lỡ in ra log quá dài: Tự động cắt gọt trong các bước tiếp theo, chuyển sang định dạng bullet point ngắn.

## Ghi chú
- Ít token hơn = Xử lý nhanh hơn = Ít ảo giác (hallucination) hơn. Restraint is a skill!
