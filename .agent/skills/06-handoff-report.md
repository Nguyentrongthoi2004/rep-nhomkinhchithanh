# 06 Handoff Report

````markdown
# Skill 06: Handoff Report

Skill này quy định cách Agent phải báo cáo sau khi hoàn thành một task code/audit/test.

Mục tiêu của skill này là đảm bảo mọi thay đổi đều được bàn giao rõ ràng cho người review/tester, giúp người sau biết chính xác Agent đã làm gì, sửa file nào, đổi logic gì, test gì, còn rủi ro gì và cần kiểm tra tiếp gì.

Agent không được chỉ nói chung chung:

```text
Đã sửa xong.
````

Agent phải báo cáo theo cấu trúc đầy đủ.

---

# 1. Vai trò của skill

Sau khi thực hiện task, Agent phải đóng vai người bàn giao kỹ thuật.

Báo cáo phải giúp reviewer/tester trả lời được:

* Task ban đầu là gì?
* Agent đã làm gì?
* Sửa những file nào?
* Logic trước/sau ra sao?
* Có đổi API không?
* Có đụng database/migration không?
* Đã chạy lint/build/test gì?
* Self-review phát hiện gì?
* Còn lỗi/rủi ro nào không?
* Tester cần kiểm tra runtime bước nào?
* Có thể xem là pass cuối chưa?

Handoff Report là tài liệu bàn giao sau mỗi lần Agent làm việc.

---

# 2. Khi nào phải dùng skill này?

Phải dùng sau mọi task:

* Implement chức năng mới
* Sửa bug
* Refactor
* Sửa UI
* Sửa API
* Sửa backend service
* Sửa database/migration
* Sửa wording
* Sửa config
* Audit code
* Runtime test
* Deploy/config
* Viết hoặc sửa tài liệu kỹ thuật

Nếu task chỉ là audit và chưa code, vẫn phải báo cáo audit theo format handoff.

Nếu task bị dừng giữa chừng, vẫn phải báo cáo:

* Đã làm tới đâu
* Vì sao dừng
* Còn thiếu gì
* Cần người dùng quyết định gì

---

# 3. Nguyên tắc viết Handoff Report

Report phải:

* Rõ ràng
* Trung thực
* Có file cụ thể
* Có kết quả test cụ thể
* Có rủi ro cụ thể
* Không phóng đại
* Không nói pass cuối nếu chưa tester duyệt
* Không giấu lỗi
* Không dùng câu mơ hồ kiểu “ổn rồi”

Agent phải phân biệt:

```text
Sẵn sàng đưa tester kiểm tra
```

và:

```text
Đã pass cuối
```

Hai khái niệm này khác nhau.

Agent chỉ được nói pass cuối nếu người review/tester đã xác nhận.

---

# 4. Handoff Report bắt buộc gồm những phần nào?

Sau mỗi task, Agent phải báo cáo theo format sau:

```text
## 1. Tóm tắt task
## 2. File đã sửa/tạo mới
## 3. Logic thay đổi
## 4. API contract
## 5. Database/Migration
## 6. Lint/Build/Test
## 7. Self-review
## 8. Rủi ro còn lại
## 9. Runtime checklist cho tester
## 10. Kết luận
```

Không được bỏ các phần quan trọng.

Nếu phần nào không áp dụng, ghi rõ:

```text
Không áp dụng vì không sửa backend.
```

hoặc:

```text
Không áp dụng vì task chỉ audit, chưa sửa code.
```

---

# 5. Phần 1: Tóm tắt task

Agent phải ghi:

* Yêu cầu ban đầu
* Mục tiêu chính
* Phạm vi thực tế đã làm

Ví dụ:

```text
## 1. Tóm tắt task

Yêu cầu:
Tách trang Admin `/admin/toi-uu-cat` thành list/detail để tránh trang quá dài khi có nhiều phân công.

Đã làm:
- Giữ `/admin/toi-uu-cat` làm trang danh sách phân công.
- Tạo `/admin/toi-uu-cat/[mapc]` làm trang chi tiết một phân công.
- Giữ nguyên logic tạo sơ đồ cắt hiện tại.
```

Nếu chưa làm hết:

```text
Đã làm:
- Đã audit UI hiện tại.
- Đã đề xuất phương án tách list/detail.

Chưa làm:
- Chưa code vì user yêu cầu audit trước.
```

---

# 6. Phần 2: File đã sửa/tạo mới

Agent phải liệt kê đầy đủ file đã sửa hoặc tạo mới.

Format:

```text
## 2. File đã sửa/tạo mới

### File 1: `path/to/file`
- Loại thay đổi: sửa / tạo mới / xóa / rename
- Sửa gì:
- Vì sao:
```

Ví dụ:

```text
### `FE/src/app/admin/toi-uu-cat/page.tsx`
- Loại thay đổi: sửa
- Sửa gì:
  - Chuyển trang này thành danh sách phân công.
  - Thêm search/filter/page size.
  - Nút “Xem chi tiết” điều hướng sang `/admin/toi-uu-cat/[mapc]`.
- Vì sao:
  - Tránh render quá nhiều sơ đồ cắt trên cùng một màn hình.
  - Giúp Admin tìm phân công dễ hơn khi dữ liệu lớn.
```

Ví dụ file mới:

```text
### `FE/src/app/admin/toi-uu-cat/[mapc]/page.tsx`
- Loại thay đổi: tạo mới
- Sửa gì:
  - Tạo trang chi tiết phân công theo `mapc`.
  - Hiển thị thông tin PC/DH, BOM nếu có, sơ đồ đã lưu và nút tạo sơ đồ cắt.
- Vì sao:
  - Tách detail khỏi list để UI dễ mở rộng.
```

Nếu không sửa file:

```text
Không sửa file nào vì task này chỉ audit.
```

---

# 7. Phần 3: Logic thay đổi

Agent phải mô tả logic trước và sau.

Format:

```text
## 3. Logic thay đổi

Trước:
- ...

Sau:
- ...
```

Ví dụ:

```text
Trước:
- `/admin/toi-uu-cat` vừa hiển thị danh sách phân công vừa hiển thị toàn bộ sơ đồ đã lưu.
- Khi nhiều phân công, trang dài và render nặng.

Sau:
- `/admin/toi-uu-cat` chỉ hiển thị danh sách phân công.
- `/admin/toi-uu-cat/[mapc]` hiển thị chi tiết một phân công.
- Logic tạo sơ đồ cắt vẫn giữ nguyên, chỉ chuyển sang trang detail.
```

Nếu logic không đổi:

```text
Logic nghiệp vụ không đổi.
Task chỉ đổi wording/UI presentation.
```

---

# 8. Phần 4: API contract

Agent phải báo rõ có đổi API hay không.

Format:

```text
## 4. API contract

Có đổi API không:
- Có / Không

Nếu có:
- Endpoint:
- Method:
- Request cũ:
- Request mới:
- Response cũ:
- Response mới:
- Ảnh hưởng FE:
- Ảnh hưởng BE:
```

Ví dụ không đổi:

```text
## 4. API contract

Có đổi API không:
- Không.

Chi tiết:
- FE vẫn dùng các API hiện tại.
- Không đổi endpoint.
- Không đổi request body.
- Không đổi response shape.
```

Ví dụ có đổi:

````text
## 4. API contract

Có đổi API không:
- Có.

Endpoint:
- `POST /api/admin/cutting-proposals/:id/reject`

Request cũ:
```json
{
  "admin_ghichu": "..."
}
````

Request mới:

```json
{
  "ghichu": "..."
}
```

Lý do:

* Backend đọc field `ghichu`, nên FE phải gửi đúng field để tránh mất ghi chú.

````

Agent phải kiểm tra field nhạy cảm.

Nếu FE không gửi field cấm, ghi:

```text
Không phát hiện FE gửi `adminId`, `score`, `metrics`, `kerf`.
````

Nếu có, phải báo P0/P1.

---

# 9. Phần 5: Database/Migration

Agent phải báo rõ có đụng database/migration không.

Format:

```text
## 5. Database/Migration

Có sửa DB/migration không:
- Có / Không

Có chạy migration không:
- Có / Không

Có ảnh hưởng dữ liệu thật không:
- Có / Không / Chưa xác định

Chi tiết:
- ...
```

Ví dụ không đụng DB:

```text
## 5. Database/Migration

Có sửa DB/migration không:
- Không.

Có chạy migration không:
- Không.

Có ảnh hưởng dữ liệu thật không:
- Không.

Chi tiết:
- Task chỉ sửa frontend UI.
```

Ví dụ có SQL nhưng chưa chạy:

```text
## 5. Database/Migration

Có sửa DB/migration không:
- Có, tạo file migration mới.

Có chạy migration không:
- Chưa chạy.

Lý do:
- Migration cần user duyệt trước khi chạy.

Rủi ro:
- Cần kiểm tra trên DB dev trước.
```

Không được nói migration pass nếu chưa chạy thật.

---

# 10. Phần 6: Lint/Build/Test

Agent phải ghi rõ lệnh đã chạy và kết quả.

Format:

```text
## 6. Lint/Build/Test

Lệnh đã chạy:
- ...

Kết quả:
- FE lint:
- FE build:
- BE lint:
- BE build:

Ghi chú:
- ...
```

Ví dụ FE only:

```text
## 6. Lint/Build/Test

Lệnh đã chạy:
- `cd FE && npm run lint`
- `cd FE && npm run build`

Kết quả:
- FE lint: pass
- FE build: pass
- BE lint: không chạy vì không sửa BE
- BE build: không chạy vì không sửa BE
```

Ví dụ có lỗi:

```text
## 6. Lint/Build/Test

Lệnh đã chạy:
- `cd FE && npm run build`

Kết quả:
- FE build: fail

Lỗi:
- File: `FE/src/app/admin/toi-uu-cat/page.tsx`
- Nội dung: Property `customerName` does not exist on type `Assignment`.

Hướng xử lý:
- Cần kiểm tra lại field API trả về hoặc thêm fallback/type phù hợp.
```

Không được ghi:

```text
Build chắc pass.
```

Nếu chưa chạy được:

```text
Chưa chạy được lint/build vì môi trường hiện tại không có dependency.
Cần chạy lại trên máy local bằng:
- `cd FE && npm run lint`
- `cd FE && npm run build`
```

---

# 11. Phần 7: Self-review

Agent phải tóm tắt kết quả self-review.

Format:

```text
## 7. Self-review

Scope:
- ...

Logic:
- ...

API:
- ...

Security/RBAC:
- ...

Frontend:
- ...

Backend:
- ...

Business:
- ...

Comment:
- ...
```

Ví dụ:

```text
## 7. Self-review

Scope:
- Sửa đúng phạm vi FE.
- Không sửa backend, migration, RPC.

Logic:
- Đã tách list/detail.
- Giữ nguyên logic tạo sơ đồ.

API:
- Không đổi API contract.

Security/RBAC:
- Không sửa auth/role.

Frontend:
- Có loading/empty/error.
- Có fallback cho dữ liệu thiếu.
- Không hiển thị NaN/undefined theo kiểm tra code.

Backend:
- Không sửa BE.

Business:
- Không đổi flow trừ kho.
- Không đổi Worker Proposal.

Comment:
- Đã comment các đoạn giữ nguyên logic tạo sơ đồ và fallback dữ liệu.
```

Nếu self-review phát hiện lỗi, phải nêu rõ.

---

# 12. Phần 8: Rủi ro còn lại

Agent phải phân loại rủi ro theo P0/P1/P2.

Format:

```text
## 8. Rủi ro còn lại

P0:
- ...

P1:
- ...

P2:
- ...
```

Nếu không có P0:

```text
P0:
- Không phát hiện.
```

Ví dụ:

```text
P1:
- Chưa runtime test bằng tài khoản Admin thật.
- API hiện tại có thể chưa trả đủ BOM detail, UI đã fallback nhưng cần tester xác nhận.

P2:
- Có thể polish responsive sau.
```

Không được giấu rủi ro.

Nếu chưa runtime test, bắt buộc ghi là P1 hoặc ghi rõ cần tester xác nhận.

---

# 13. Phần 9: Runtime checklist cho tester

Agent phải đưa checklist ngắn, đúng task.

Không cần copy toàn bộ Skill 05 nếu report dài, nhưng phải đủ bước chính.

Format:

```text
## 9. Runtime checklist cho tester

Role:
- ...

Route:
- ...

Checklist:
1. ...
2. ...
3. ...

DevTools:
- Console:
- Network:

Kết quả mong đợi:
- ...
```

Ví dụ:

```text
## 9. Runtime checklist cho tester

Role:
- Admin

Route:
- `/admin/toi-uu-cat`
- `/admin/toi-uu-cat/[mapc]`

Checklist:
1. Login Admin.
2. Vào `/admin/toi-uu-cat`.
3. Kiểm tra danh sách phân công hiển thị.
4. Search theo mã phân công.
5. Filter trạng thái.
6. Bấm “Xem chi tiết”.
7. Kiểm tra URL chuyển sang `/admin/toi-uu-cat/8`.
8. Kiểm tra chi tiết PC/DH đúng.
9. Kiểm tra sơ đồ đã lưu.
10. Bấm tạo sơ đồ nếu dữ liệu phù hợp.

DevTools:
- Console không có lỗi đỏ.
- Network không có API 500.
- Request không gửi field cấm.

Kết quả mong đợi:
- List/detail tách rõ.
- Không crash.
- Logic tạo sơ đồ vẫn chạy như trước.
```

---

# 14. Phần 10: Kết luận

Agent phải kết luận đúng mức.

Format:

```text
## 10. Kết luận

- Sẵn sàng đưa reviewer/tester kiểm tra:
- Có thể pass cuối chưa:
- Cần tester xác nhận:
```

Ví dụ đúng:

```text
## 10. Kết luận

- Sẵn sàng đưa reviewer/tester kiểm tra: Có.
- Có thể pass cuối chưa: Chưa, vì cần runtime test bằng tài khoản thật.
- Cần tester xác nhận:
  - Trang list/detail hoạt động đúng.
  - Tạo sơ đồ cắt vẫn chạy đúng.
  - Không có lỗi Console/Network.
```

Ví dụ sai:

```text
Xong rồi, pass.
```

---

# 15. Handoff Report cho task audit-only

Nếu task chỉ audit, report phải có format riêng.

```text
## 1. Tóm tắt audit
- Mục tiêu:
- Phạm vi:

## 2. File/module đã kiểm tra
- ...

## 3. Kết quả chính
- ...

## 4. Lỗi/rủi ro phát hiện
P0:
P1:
P2:

## 5. Phương án đề xuất
- ...

## 6. Có code không?
- Không.

## 7. Có chạy lint/build không?
- Có/Không, lý do:

## 8. Bước tiếp theo
- ...
```

Ví dụ:

```text
## 6. Có code không?
- Không. Task này chỉ audit và đề xuất phương án.
```

---

# 16. Handoff Report cho task bị dừng

Nếu task phải dừng giữa chừng, Agent vẫn phải báo cáo.

```text
## 1. Task đang làm
- ...

## 2. Đã làm được
- ...

## 3. Lý do phải dừng
- ...

## 4. Vấn đề cần user quyết định
- ...

## 5. File đã đụng nếu có
- ...

## 6. Rủi ro nếu làm tiếp
- ...

## 7. Đề xuất tiếp theo
- ...
```

Ví dụ:

```text
Lý do phải dừng:
- Phát hiện muốn tách detail cần API mới trả BOM theo mapc.
- Đây là thay đổi backend ngoài phạm vi FE-only ban đầu.

Cần user quyết định:
- Cho phép sửa backend thêm endpoint detail không?
```

---

# 17. Handoff Report cho task fail test

Nếu lint/build/test fail và chưa sửa được, phải báo cáo rõ.

```text
## 1. Task
- ...

## 2. Lệnh fail
- ...

## 3. Lỗi
- File:
- Nội dung:

## 4. Đã thử xử lý
- ...

## 5. Vì sao chưa xử lý được
- ...

## 6. Cần quyết định gì
- ...

## 7. Trạng thái
- Chưa sẵn sàng đưa tester.
```

Không được nói “lỗi nhỏ” nếu chưa phân tích.

---

# 18. Handoff Report cho task deploy

Nếu task liên quan deploy, phải báo cáo thêm:

```text
## Deploy Report

Frontend:
- Platform:
- Root directory:
- Build command:
- Env:
- URL:

Backend:
- Platform:
- Root directory:
- Build command:
- Start command:
- Env:
- URL:

Post-deploy test:
- Login:
- API:
- CORS:
- Route chính:
- Logs:

Rủi ro:
- ...
```

Không được báo deploy thành công nếu chưa có URL hoặc chưa test route chính.

---

# 19. Các câu Agent được dùng

Agent được dùng:

```text
Đã sửa xong trong phạm vi task.
Lint/build pass.
Self-review không phát hiện P0.
Sẵn sàng đưa reviewer/tester kiểm tra runtime.
Pass cuối cần tester xác nhận.
```

Agent được dùng nếu chưa test runtime:

```text
Chưa runtime test bằng tài khoản thật.
Cần tester kiểm tra theo checklist bên dưới.
```

Agent được dùng nếu chưa chạy build:

```text
Chưa chạy được build trong môi trường hiện tại.
Cần chạy lại lệnh sau trên máy local.
```

---

# 20. Các câu Agent không được dùng

Agent không được dùng:

```text
Pass 100%.
Không còn lỗi.
Bàn giao chắc chắn.
Build pass nên runtime chắc chắn đúng.
Đã hoàn thành cuối cùng.
```

Trừ khi người review/tester đã xác nhận pass cuối.

---

# 21. Ví dụ Handoff Report đúng

```text
## 1. Tóm tắt task

Yêu cầu:
Tách trang Admin `/admin/toi-uu-cat` thành list/detail.

Đã làm:
- `/admin/toi-uu-cat` chuyển thành trang danh sách phân công.
- Tạo `/admin/toi-uu-cat/[mapc]` làm trang chi tiết.
- Giữ nguyên logic tạo sơ đồ cắt hiện tại.

## 2. File đã sửa/tạo mới

### `FE/src/app/admin/toi-uu-cat/page.tsx`
- Loại thay đổi: sửa
- Sửa gì:
  - Chỉ còn hiển thị danh sách phân công.
  - Thêm search/filter/page size.
  - Nút “Xem chi tiết”.
- Vì sao:
  - Tránh trang dài và render nặng khi nhiều phân công.

### `FE/src/app/admin/toi-uu-cat/[mapc]/page.tsx`
- Loại thay đổi: tạo mới
- Sửa gì:
  - Hiển thị chi tiết một phân công.
  - Hiển thị sơ đồ đã lưu và nút tạo sơ đồ.
- Vì sao:
  - Tách detail khỏi list để dễ quản lý.

## 3. Logic thay đổi

Trước:
- List phân công và detail sơ đồ nằm chung một trang.

Sau:
- List và detail tách thành hai route.
- Logic tạo sơ đồ không đổi.

## 4. API contract

Có đổi API không:
- Không.

Chi tiết:
- FE vẫn dùng API hiện tại.
- Không đổi request/response.
- Không gửi field nhạy cảm.

## 5. Database/Migration

Có sửa DB/migration không:
- Không.

Có chạy migration không:
- Không.

Có ảnh hưởng dữ liệu thật không:
- Không.

## 6. Lint/Build/Test

Lệnh đã chạy:
- `cd FE && npm run lint`
- `cd FE && npm run build`

Kết quả:
- FE lint: pass
- FE build: pass
- BE lint: không chạy vì không sửa BE
- BE build: không chạy vì không sửa BE

## 7. Self-review

Scope:
- Sửa đúng phạm vi FE.
- Không sửa backend/migration/RPC.

Logic:
- Đã tách list/detail.
- Không đổi flow tạo sơ đồ.

API:
- Không đổi API contract.

Frontend:
- Có loading/empty/error.
- Có fallback dữ liệu thiếu.
- Có format số.

Business:
- Không đổi flow trừ kho.
- Không đổi Worker Proposal.

## 8. Rủi ro còn lại

P0:
- Không phát hiện.

P1:
- Chưa runtime test bằng tài khoản Admin thật.
- Cần kiểm tra tạo sơ đồ cắt vẫn chạy đúng.

P2:
- Có thể polish responsive sau.

## 9. Runtime checklist cho tester

Role:
- Admin

Route:
- `/admin/toi-uu-cat`
- `/admin/toi-uu-cat/8`

Checklist:
1. Login Admin.
2. Vào `/admin/toi-uu-cat`.
3. Search/filter danh sách phân công.
4. Bấm “Xem chi tiết”.
5. Kiểm tra detail đúng mapc.
6. Kiểm tra sơ đồ đã lưu.
7. Bấm tạo sơ đồ nếu dữ liệu phù hợp.
8. Mở DevTools kiểm tra Console/Network.

Kết quả mong đợi:
- Không crash.
- Không hiện undefined/null/NaN.
- Không có API 500.
- Logic tạo sơ đồ vẫn như trước.

## 10. Kết luận

- Sẵn sàng đưa reviewer/tester kiểm tra: Có.
- Có thể pass cuối chưa: Chưa.
- Cần tester xác nhận runtime trước khi pass.
```

---

# 22. Tiêu chuẩn hoàn thành Skill 06

Skill này được xem là làm đúng khi Agent:

* Báo cáo đủ file sửa.
* Mô tả rõ logic trước/sau.
* Nói rõ API có đổi không.
* Nói rõ DB/migration có đụng không.
* Ghi lệnh test đã chạy.
* Ghi kết quả pass/fail thật.
* Có self-review.
* Có rủi ro P0/P1/P2.
* Có runtime checklist.
* Không tự pass cuối.

Skill này làm sai nếu Agent:

* Chỉ nói “done”.
* Không liệt kê file sửa.
* Không ghi test đã chạy.
* Không nêu rủi ro.
* Không phân biệt lint/build pass với runtime pass.
* Không tạo checklist tester.
* Tự nói pass cuối khi chưa tester duyệt.

```
```
