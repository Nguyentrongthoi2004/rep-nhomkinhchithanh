---
name: minierp-graduation-docs
description: >
  Dùng để cập nhật tài liệu tốt nghiệp khi một tính năng lớn đã hoàn thiện (pass cuối).
version: 1.0.0
domain: software_engineering
updated: 2026-05-27
author: MiniERP_NhomKinh_AI_Agent
---

# MiniERP Graduation Docs

## Vai trò
Agent Technical Writer: Đảm bảo tài liệu đặc tả dự án tốt nghiệp được cập nhật chính xác, mang tính học thuật, không nói quá.

## Đầu vào
### Bắt buộc
- Chức năng lớn đã được Tester/Reviewer xác nhận "Pass cuối".
- Đường dẫn: `D:\MiniERP_NhomKinh\TaiLieuDacTa`.

## Đầu ra
- Tài liệu markdown hoặc file được update.
- Chừa các placeholder cho ảnh chụp màn hình UI.

## Quy trình

### Bước 1: Xác nhận Pass Cuối
Action:
- Đảm bảo task thực sự đã pass cuối cùng.
Verify:
- Không viết docs cho một tính năng còn đang dang dở.

### Bước 2: Chọn đúng file tài liệu
Action:
- Đọc cấu trúc tài liệu hiện có trong `TaiLieuDacTa` trước khi update.
- Update vào các file tài liệu hiện có trong `TaiLieuDacTa`.
Verify:
- Không tạo hàng loạt tài liệu rời rạc (trừ khi được yêu cầu). Nếu chưa xác định được file tài liệu chính, phải dừng và hỏi user, không tự tạo nhiều file rời.

### Bước 3: Cập nhật nội dung học thuật
Action:
- Mô tả logic hệ thống, thuật toán (heuristic, rule-based), RBAC.
Verify:
- Dùng văn phong nghiêm túc, kỹ thuật.

### Bước 4: Tạo Placeholder Ảnh
Action:
- Đặt placeholder ảnh giao diện theo format:
  `[CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]`
  `Hình X.Y. Tên giao diện`
  `Gợi ý ảnh cần chụp:`
  `- Route:`
  `- Trạng thái dữ liệu:`
  `- Nội dung cần thấy:`
Verify:
- Placeholder ghi rõ tên hình, route cần chụp và dữ liệu mẫu cần có.

## Quy tắc

### MUST
- Phải trung thực. Mô tả đúng code làm gì, chưa làm gì.
- Phải chừa chỗ trống để dán ảnh giao diện.

### MUST NOT
- KHÔNG dùng từ ngữ marketing như "AI tự tối ưu hoàn hảo", "tối ưu tuyệt đối". (Dùng "heuristic/rule-based hỗ trợ ra quyết định").
- KHÔNG biến tài liệu đặc tả thành một mớ logs dài dòng.

## Ví dụ

### Input
```text
Cập nhật tài liệu cho chức năng Worker Proposal đã pass.
```

### Output
```text
Đã cập nhật file `TaiLieuDacTa/ChucNang.md`:
- Bổ sung luồng "Đề xuất phương án cắt".
- Thêm placeholder: 
  [CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]
  Hình 4.1. Màn hình Worker tạo Proposal
  Gợi ý ảnh cần chụp:
  - Route: /worker/cat
  - Trạng thái dữ liệu: Nhập lý do khác thực tế
  - Nội dung cần thấy: Toast thông báo thành công
- Nêu rõ: Chức năng dựa trên RBAC, thuật toán heuristic/rule-based hỗ trợ ra quyết định thay vì tin tưởng client.
```

## Xử lý lỗi
- Nếu file tài liệu gốc bị mất hoặc không thấy, dừng lại và hỏi người dùng đường dẫn đúng.

## Ghi chú
- Công việc cuối cùng của chu trình phần mềm. Làm cẩn thận để sau này dễ dàng copy vào file Word đồ án.
