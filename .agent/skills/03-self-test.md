# 03 Self Test

````markdown
# Skill 03: Self Test

Skill này quy định cách Agent phải tự kiểm tra sau khi code xong.

Mục tiêu của skill này là đảm bảo code không chỉ được viết xong, mà còn phải được kiểm tra tối thiểu bằng lint, build, test cơ bản và checklist nghiệp vụ trước khi bàn giao cho reviewer/tester.

Agent không được báo “xong” nếu chưa chạy kiểm tra phù hợp hoặc chưa nói rõ vì sao không chạy được.

---

# 1. Vai trò của skill

Sau khi implement, Agent phải đóng vai người tự kiểm thử bước đầu.

Agent phải kiểm tra:

- Code có lỗi lint không.
- Code có build được không.
- TypeScript có lỗi không.
- FE/BE có bị lệch API không.
- Logic vừa sửa có đúng yêu cầu không.
- Có lỗi runtime dễ thấy không.
- Có cần tester kiểm tra flow thật không.

Self Test không thay thế tester.

Self Test chỉ chứng minh code đã qua kiểm tra kỹ thuật cơ bản và sẵn sàng để reviewer/tester test tiếp.

---

# 2. Khi nào phải dùng skill này?

Phải dùng sau mọi task có sửa code.

Bao gồm:

- Sửa Frontend
- Sửa Backend
- Sửa API client
- Sửa route
- Sửa service
- Sửa schema
- Sửa component UI
- Tạo page mới
- Refactor code
- Sửa wording trong UI
- Sửa script
- Sửa config build
- Sửa tài liệu có liên quan tới code nếu cần kiểm tra build

Không được bỏ qua Self Test chỉ vì task nhỏ.

Ví dụ task nhỏ như đổi field:

```text
admin_ghichu → ghichu
````

vẫn phải chạy lint/build phù hợp vì có thể sai type hoặc sai import.

---

# 3. Nguyên tắc chung

Agent phải chạy test theo phần code đã sửa.

Nếu sửa FE thì chạy FE.

Nếu sửa BE thì chạy BE.

Nếu sửa cả FE và BE thì chạy cả hai.

Nếu chỉ audit, không code, thì không bắt buộc chạy build nhưng phải nói rõ:

```text
Task này chỉ audit, chưa sửa code nên chưa chạy lint/build.
```

Nếu không chạy được lệnh vì thiếu môi trường, thiếu package, lỗi quyền hoặc timeout, Agent phải báo rõ.

Không được bịa kết quả test.

Không được nói pass nếu chưa thật sự chạy.

---

# 4. Lệnh bắt buộc cho Frontend

Nếu có sửa bất kỳ file nào trong `FE`, Agent phải chạy:

```bash
cd FE
npm run lint
npm run build
```

Ví dụ các file FE:

```text
FE/src/app/...
FE/src/components/...
FE/src/lib/api.ts
FE/src/hooks/...
FE/src/types/...
FE/src/styles/...
```

Sau khi chạy, Agent phải báo:

```text
FE lint: pass/fail
FE build: pass/fail
```

Nếu fail, phải ghi rõ:

* Lệnh nào fail
* File nào lỗi
* Lỗi chính là gì
* Có sửa được trong phạm vi không
* Nếu cần sửa ngoài phạm vi thì phải hỏi

---

# 5. Lệnh bắt buộc cho Backend

Nếu có sửa bất kỳ file nào trong `BE`, Agent phải chạy:

```bash
cd BE
npm run lint
npm run build
```

Ví dụ các file BE:

```text
BE/src/app.ts
BE/src/routes/...
BE/src/modules/...
BE/src/middlewares/...
BE/src/config/...
BE/src/lib/...
BE/src/scripts/...
```

Sau khi chạy, Agent phải báo:

```text
BE lint: pass/fail
BE build: pass/fail
```

Nếu fail, phải ghi rõ:

* Lệnh nào fail
* File nào lỗi
* Lỗi chính là gì
* Có sửa được trong phạm vi không
* Nếu cần sửa ngoài phạm vi thì phải hỏi

---

# 6. Nếu sửa cả Frontend và Backend

Nếu task sửa cả FE và BE, Agent phải chạy đủ:

```bash
cd BE
npm run lint
npm run build
```

và:

```bash
cd FE
npm run lint
npm run build
```

Báo cáo phải ghi đủ:

```text
BE lint:
BE build:
FE lint:
FE build:
```

Không được chỉ chạy một bên rồi kết luận toàn bộ task pass.

---

# 7. Nếu sửa script dev-only

Nếu sửa script trong:

```text
BE/src/scripts/dev/...
```

Agent phải kiểm tra:

* Script có bị import vào production không.
* Script có chạy tự động khi server start không.
* Script có nằm trong build chính không.
* Script có mutate DB không.
* Script có guard an toàn không.

Nếu script có insert/update/delete dữ liệu DB, bắt buộc phải có guard:

```ts
if (process.env.ALLOW_DEV_DB_MUTATION !== "true") {
  throw new Error(
    "Script này có mutation DB. Set ALLOW_DEV_DB_MUTATION=true nếu chắc chắn đang chạy trên DB dev."
  );
}
```

Không được chạy script mutate DB nếu chưa được người dùng cho phép.

Không được chạy script mutate DB trên dữ liệu thật.

Nếu chỉ sửa guard hoặc comment script, vẫn phải chạy:

```bash
cd BE
npm run lint
npm run build
```

---

# 8. Nếu sửa Database/Migration

Agent không được tự chạy migration nếu chưa được duyệt.

Nếu có sửa file migration hoặc SQL, Self Test chỉ được làm ở mức:

* Kiểm tra cú pháp SQL bằng đọc code.
* Kiểm tra idempotency.
* Kiểm tra có `IF NOT EXISTS` hoặc cơ chế an toàn nếu phù hợp.
* Kiểm tra không có `DROP`, `TRUNCATE`, `DELETE` nguy hiểm.
* Kiểm tra không đụng migration deprecated nếu không được yêu cầu.

Agent phải báo:

```text
Chưa chạy migration vì cần người dùng duyệt trước.
```

Không được tự nói migration đã pass nếu chưa chạy thật.

---

# 9. Kiểm tra TypeScript

Sau khi build, Agent phải để ý các lỗi TypeScript thường gặp:

* Sai type response API.
* Field không tồn tại.
* Null/undefined chưa xử lý.
* Function thiếu return.
* Import sai path.
* Component prop thiếu.
* Hook dependency sai nếu lint bắt.
* Dùng `any` quá mức.
* Dùng biến không dùng.
* Dùng state chưa khai báo.

Nếu có lỗi TypeScript, không được bỏ qua bằng cách ép `any` bừa bãi.

Chỉ dùng `any` khi:

* Dữ liệu API hiện chưa có type rõ.
* Có comment giải thích.
* Có fallback runtime an toàn.

Ví dụ:

```ts
// API cũ chưa có type thống nhất cho metrics, nên parse phòng thủ trước khi hiển thị.
const metrics = rawMetrics as Partial<CuttingMetrics>;
```

---

# 10. Kiểm tra Frontend runtime cơ bản

Lint/build pass chưa đủ.

Nếu có sửa UI, Agent phải tự kiểm tra hoặc tạo checklist để tester kiểm tra runtime.

Các điểm cần kiểm:

* Page có render được không.
* Loading state có hoạt động không.
* Empty state có hoạt động không.
* Error state có hoạt động không.
* Search/filter/sort có chạy không nếu có.
* Button có enable/disable đúng không.
* Click route có đúng không.
* Không có React key warning.
* Không có hydration error.
* Không có `undefined`, `null`, `NaN` trên UI.
* Format số đúng.
* Console không có lỗi đỏ nghiêm trọng.
* Network không có API fail ngoài dự kiến.

Nếu Agent không thể mở browser/test runtime, phải ghi rõ:

```text
Chưa runtime test bằng trình duyệt thật. Cần tester kiểm tra theo checklist.
```

---

# 11. Kiểm tra Backend runtime cơ bản

Nếu sửa Backend, Agent phải kiểm tra logic ở mức cơ bản:

* Route có auth không.
* Route có role guard không.
* Controller gọi đúng service không.
* Service validate input không.
* Không tin field nhạy cảm từ client.
* Error được map đúng status không.
* Response shape có khớp FE không.
* Không mutate bảng ngoài nghiệp vụ.
* Không phá flow cũ.

Nếu có thể test API bằng script/dev tool mà không phá dữ liệu, Agent có thể chạy.

Nếu API test có mutate DB, phải hỏi trước.

---

# 12. Kiểm tra API contract FE/BE

Nếu task liên quan API, Agent phải kiểm tra:

* FE gọi đúng route.
* FE gửi đúng request body.
* FE không gửi field cấm.
* BE đọc đúng field.
* BE response có field FE đang dùng.
* Error response được FE hiển thị.

Frontend không được gửi:

```text
adminId
workerId
role
score
metrics
kerf
service_role_key
```

Ví dụ cần kiểm:

```text
FE approve/reject phải gửi `{ ghichu }`, không gửi `{ admin_ghichu }` nếu backend schema đọc `ghichu`.
```

Nếu phát hiện lệch contract, phải báo lỗi P1 hoặc P0 tùy mức độ.

---

# 13. Kiểm tra RBAC/Auth

Nếu task đụng route hoặc dữ liệu theo role, Agent phải kiểm tra:

## Admin route

Phải có:

```text
authMiddleware
requireRole("ADMIN")
```

## Worker route

Phải có:

```text
authMiddleware
requireRole("WORKER")
```

## Worker data scope

Worker chỉ được xem dữ liệu thuộc phân công của mình.

Nếu có query `mapc`, backend phải kiểm tra `mapc` thuộc worker hiện tại.

Không được tin `workerId` từ FE.

---

# 14. Kiểm tra nghiệp vụ cutting/proposal

Nếu task đụng module cắt vật tư, sơ đồ cắt hoặc proposal, Agent phải kiểm tra nghiệp vụ.

## Worker Proposal

Phải đảm bảo:

* Worker chỉ gửi đề xuất.
* Worker không sửa sơ đồ chính thức.
* Worker không approve/reject.
* FE không gửi score/metrics/kerf.
* Backend tự validate và tự tính metrics.
* Admin là người duyệt cuối.

## Admin Proposal

Phải đảm bảo:

* Admin approve/reject qua backend/RPC.
* FE không gửi adminId.
* Ghi chú dùng đúng field `ghichu`.
* Proposal hết hiệu lực phải báo rõ EXPIRED/409 nếu có.

## Tạo sơ đồ cắt

Phải đảm bảo:

* Tạo sơ đồ không trừ kho.
* Kho chỉ trừ khi completePlan/flow hoàn thành cắt.
* Không tạo lại sơ đồ đã hoàn thành mà không cảnh báo/chặn.
* Không hard replace dữ liệu ngoài flow được thiết kế.

---

# 15. Kiểm tra dữ liệu hiển thị trên UI

Nếu sửa UI, Agent phải kiểm:

* Có fallback khi thiếu tên khách hàng.
* Có fallback khi thiếu worker.
* Có fallback khi thiếu ngày.
* Có fallback khi thiếu metrics.
* Có fallback khi thiếu danh sách sơ đồ.
* Không hiện raw JSON khó hiểu cho user.
* Không hiện số dài.

Format chuẩn:

```text
27.21%
60 mm
—
```

Không được:

```text
27.207657689834992%
60mm
NaN%
undefined
null
```

---

# 16. Kiểm tra lỗi React key

Nếu có render list, Agent phải kiểm tra key.

Không dùng key có thể undefined.

Ưu tiên:

```tsx
key={item.id ?? item.madxc ?? item.mapc}
```

Nếu list có thể search/filter/sort, không dùng index làm key.

Nếu bắt buộc dùng index, phải comment lý do.

---

# 17. Kiểm tra sau khi sửa wording

Nếu task chỉ sửa wording, Agent vẫn phải kiểm tra:

* Wording mới có đúng nghiệp vụ không.
* Có còn chữ cũ ở file liên quan không.
* Không làm thay đổi logic.
* Không sửa API.
* Không sửa backend nếu không cần.
* FE lint/build pass.

Ví dụ với Worker Proposal, phải tránh còn sót:

```text
tối ưu mới
Worker tự tối ưu
mô phỏng tối ưu lại
```

Nên dùng:

```text
đề xuất điều chỉnh phương án cắt
phương án Worker đề xuất
phương án cắt thực tế
gửi Admin duyệt
```

---

# 18. Khi test fail thì phải làm gì?

Nếu lint/build/test fail, Agent phải:

1. Ghi rõ lỗi.
2. Xác định lỗi thuộc file nào.
3. Xác định lỗi có nằm trong phạm vi task không.
4. Nếu nằm trong phạm vi, sửa và chạy lại.
5. Nếu ngoài phạm vi, báo người dùng trước khi sửa.
6. Không giấu lỗi.
7. Không kết luận pass.

Ví dụ báo cáo đúng:

```text
FE build fail tại `FE/src/app/admin/toi-uu-cat/page.tsx` do field `customerName` có thể undefined.
Đây là lỗi trong phạm vi file vừa sửa, tôi sẽ thêm fallback và chạy build lại.
```

Ví dụ báo cáo sai:

```text
Có lỗi nhỏ nhưng không ảnh hưởng.
```

mà không nêu lỗi cụ thể.

---

# 19. Không được dùng build pass để thay thế runtime test

Agent không được nói:

```text
Build pass nên chức năng chắc chắn chạy đúng.
```

Phải nói:

```text
Build/lint pass. Cần runtime test bằng tài khoản thật để xác nhận flow nghiệp vụ.
```

Build pass chỉ xác nhận:

* Code compile được.
* Type/lint cơ bản ổn.

Build pass không xác nhận:

* API có trả đúng dữ liệu không.
* User có click được không.
* Role có đúng không.
* Nghiệp vụ có hợp lý không.
* Database có trạng thái phù hợp không.

---

# 20. Output bắt buộc sau Self Test

Sau khi Self Test, Agent phải báo cáo theo format:

```text
## 1. Lệnh đã chạy
- ...

## 2. Kết quả lint/build
- BE lint:
- BE build:
- FE lint:
- FE build:

## 3. Lỗi phát hiện
- Không có
hoặc
- Lỗi 1:
  - Lệnh:
  - File:
  - Nội dung lỗi:
  - Hướng xử lý:

## 4. Kiểm tra API contract
- Có đổi API không:
- FE/BE có khớp không:
- Field nhạy cảm có bị gửi từ FE không:

## 5. Kiểm tra RBAC/Auth nếu liên quan
- Admin route:
- Worker route:
- Data scope:

## 6. Kiểm tra nghiệp vụ nếu liên quan
- Đạt:
- Rủi ro:

## 7. Runtime test
- Đã test runtime chưa:
- Nếu chưa, lý do:
- Checklist cần tester kiểm tra:

## 8. Kết luận
- Sẵn sàng đưa reviewer/tester kiểm tra chưa:
- Có thể pass cuối chưa:
```

---

# 21. Ví dụ output đúng

```text
## 1. Lệnh đã chạy
- cd FE && npm run lint
- cd FE && npm run build

## 2. Kết quả lint/build
- BE lint: không chạy vì không sửa BE
- BE build: không chạy vì không sửa BE
- FE lint: pass
- FE build: pass

## 3. Lỗi phát hiện
- Không có lỗi lint/build.

## 4. Kiểm tra API contract
- Không đổi API contract.
- FE vẫn gọi API cũ.
- Không gửi adminId/score/metrics/kerf.

## 5. Kiểm tra RBAC/Auth nếu liên quan
- Không sửa route/auth.

## 6. Kiểm tra nghiệp vụ nếu liên quan
- Wording đã chuyển từ “tối ưu mới” sang “đề xuất điều chỉnh phương án cắt”.
- Không đổi logic gửi proposal.

## 7. Runtime test
- Chưa runtime test bằng trình duyệt thật.
- Cần tester kiểm tra:
  1. Login Worker
  2. Vào /worker/cat?mapc=...
  3. Mở modal đề xuất
  4. Gửi proposal
  5. Admin xem/reject/approve

## 8. Kết luận
- Sẵn sàng đưa reviewer/tester kiểm tra.
- Chưa thể pass cuối nếu chưa runtime test.
```

---

# 22. Ví dụ output khi lỗi

```text
## 1. Lệnh đã chạy
- cd FE && npm run build

## 2. Kết quả lint/build
- FE build: fail

## 3. Lỗi phát hiện
- Lệnh: npm run build
- File: FE/src/app/admin/toi-uu-cat/page.tsx
- Lỗi: Property `customerName` does not exist on type `Assignment`.
- Hướng xử lý: kiểm tra type dữ liệu assignment hiện tại và dùng đúng field API trả về, hoặc thêm fallback an toàn.

## 4. Kết luận
- Chưa sẵn sàng đưa tester.
- Cần sửa lỗi build trước.
```

---

# 23. Tiêu chuẩn hoàn thành Skill 03

Skill này được xem là làm đúng khi Agent:

* Chạy đúng lint/build theo phần code đã sửa.
* Không bịa kết quả test.
* Báo lỗi rõ nếu fail.
* Không dùng build pass thay thế runtime test.
* Kiểm tra API contract nếu có liên quan.
* Kiểm tra RBAC nếu có liên quan.
* Kiểm tra nghiệp vụ nếu có liên quan.
* Tạo checklist runtime cho tester.
* Không tự quyết định pass cuối.

Skill này làm sai nếu Agent:

* Không chạy lint/build sau khi sửa code.
* Chỉ nói “đã test” nhưng không ghi lệnh.
* Build fail nhưng vẫn nói hoàn thành.
* Không ghi lỗi cụ thể.
* Không tạo checklist runtime.
* Nói pass cuối khi chưa có tester duyệt.

```
```
