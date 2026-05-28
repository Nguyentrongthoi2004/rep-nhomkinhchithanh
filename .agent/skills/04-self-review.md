# 04 Self Review

````markdown
# Skill 04: Self Review

Skill này quy định cách Agent phải tự review lại code sau khi implement và self test.

Mục tiêu của skill này là bắt Agent tự soi lại thay đổi của mình như một reviewer senior trước khi bàn giao cho người review/tester.

Self Review không thay thế human review.

Agent không được tự quyết định pass cuối.  
Agent chỉ được kết luận task đã “sẵn sàng đưa reviewer/tester kiểm tra” nếu không còn lỗi P0 và lint/build phù hợp đã pass.

---

# 1. Vai trò của skill

Sau khi code và chạy Self Test, Agent phải tự review lại toàn bộ thay đổi.

Agent phải kiểm tra:

- Có làm đúng yêu cầu không.
- Có sửa đúng phạm vi không.
- Có sửa lan không.
- Có phá flow cũ không.
- Có lỗi logic không.
- Có lỗi nghiệp vụ không.
- Có lỗi security/RBAC không.
- Có lỗi API contract không.
- Có lỗi UI/runtime dễ thấy không.
- Có thiếu comment ở đoạn logic quan trọng không.
- Có cần tester kiểm tra gì không.

Agent phải review với tiêu chuẩn tương đương một nhóm:

- Senior Frontend Reviewer
- Senior Backend Reviewer
- Database Reviewer
- Security/RBAC Reviewer
- QA Reviewer
- Business Logic Reviewer

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
- Sửa UI wording
- Sửa business flow
- Sửa script
- Refactor
- Tạo page/component mới
- Tạo helper mới
- Sửa config

Nếu task chỉ là audit và không code, Agent có thể dùng Self Review để review báo cáo audit, nhưng phải ghi rõ:

```text
Task này chỉ audit, không sửa code. Self-review áp dụng cho kết luận audit, không áp dụng cho diff code.
````

---

# 3. Điều kiện trước khi Self Review

Trước khi Self Review, Agent phải có:

* Danh sách file đã sửa.
* Tóm tắt logic đã đổi.
* Kết quả lint/build nếu có sửa code.
* Biết API contract có đổi không.
* Biết có đụng DB/migration không.

Nếu chưa có đủ thông tin, Agent phải bổ sung trước khi review.

---

# 4. Review phạm vi sửa

Agent phải kiểm tra:

## 4.1. Có sửa đúng phạm vi không?

Đối chiếu với phạm vi đã xác định ở Skill 01.

Ví dụ task yêu cầu chỉ sửa:

```text
FE/src/app/admin/toi-uu-cat/page.tsx
FE/src/app/admin/toi-uu-cat/[mapc]/page.tsx
```

Agent phải kiểm tra xem có lỡ sửa:

```text
BE/src/...
supabase_scripts/...
FE/src/app/worker/...
```

không.

## 4.2. Có sửa lan không?

Nếu có sửa lan, phải báo rõ:

```text
Phát hiện sửa ngoài phạm vi:
- File:
- Lý do:
- Có cần giữ thay đổi này không:
```

Nếu sửa ngoài phạm vi không cần thiết, Agent phải báo rủi ro và chờ người dùng quyết định. Không tự revert nếu chưa được yêu cầu.

## 4.3. Có file bị tạo mới ngoài kế hoạch không?

Nếu có file mới, phải giải thích:

* File đó để làm gì.
* Vì sao cần tạo.
* Có thể gộp vào file cũ không.
* Có ảnh hưởng routing/build không.

---

# 5. Review logic yêu cầu

Agent phải kiểm tra yêu cầu ban đầu so với code đã sửa.

Trả lời:

* Yêu cầu đã được đáp ứng chưa?
* Phần nào đã làm?
* Phần nào chưa làm?
* Phần nào cố ý chưa làm vì ngoài phạm vi?
* Có chỗ nào hiểu sai yêu cầu không?

Ví dụ:

```text
Yêu cầu: tách /admin/toi-uu-cat thành list/detail.
Đã làm:
- /admin/toi-uu-cat chỉ hiển thị danh sách.
- /admin/toi-uu-cat/[mapc] hiển thị chi tiết.
Chưa làm:
- Chưa thêm preview trước khi lưu vì backend chưa có API preview.
```

Không được nói “xong” nếu còn phần chưa làm mà không nêu rõ.

---

# 6. Review API contract

Nếu task có liên quan FE/BE/API, Agent phải kiểm tra kỹ contract.

## 6.1. FE gọi đúng route không?

Kiểm tra:

* URL đúng không.
* Method đúng không.
* Query param đúng không.
* Body đúng không.
* Header auth đúng không.

## 6.2. BE đọc đúng field không?

Kiểm tra:

* FE gửi field nào.
* BE schema/controller đọc field nào.
* Có lệch tên field không.
* Có field nào bị bỏ sót không.

Ví dụ cần tránh:

```text
FE gửi admin_ghichu
BE đọc ghichu
```

## 6.3. Response có khớp UI không?

Kiểm tra:

* UI có dùng field không tồn tại không.
* UI có fallback khi field thiếu không.
* Type/interface có đúng không.
* Có chỗ nào dùng `any` quá mức không.

## 6.4. Có đổi API contract không?

Nếu có đổi, phải báo:

```text
API contract có đổi:
- Endpoint:
- Trước:
- Sau:
- Ảnh hưởng:
```

Nếu không đổi, phải ghi:

```text
Không đổi API contract.
```

---

# 7. Review security/RBAC

Nếu task đụng route, auth, proposal, assignment, cutting plan hoặc dữ liệu theo user, Agent phải kiểm tra RBAC.

## 7.1. Route Admin

Phải có:

```text
authMiddleware
requireRole("ADMIN")
```

Admin route không được public.

## 7.2. Route Worker

Phải có:

```text
authMiddleware
requireRole("WORKER")
```

Worker route không được cho Admin dùng nếu đó là route context worker, trừ khi có lý do rõ ràng và đã được thiết kế.

## 7.3. Data scope

Worker chỉ được xem dữ liệu thuộc phân công của mình.

Nếu có `mapc`, backend phải kiểm tra `mapc` thuộc worker hiện tại.

Không được tin `workerId` từ FE.

## 7.4. Field cấm từ FE

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

Nếu phát hiện gửi field cấm, phải đánh dấu P0 hoặc P1 tùy mức độ.

---

# 8. Review Frontend

Nếu task có sửa FE, Agent phải kiểm tra các điểm sau.

## 8.1. Loading state

Màn hình/component có loading state không?

Nếu API đang tải, UI có báo cho user không?

## 8.2. Empty state

Nếu không có dữ liệu, UI có hiển thị thông báo rõ không?

Ví dụ:

```text
Chưa có phân công cần lập sơ đồ cắt.
```

## 8.3. Error state

Nếu API lỗi, UI có hiển thị lỗi dễ hiểu không?

Không được để trang trắng.

## 8.4. Fallback dữ liệu thiếu

Không được hiện:

```text
undefined
null
NaN
NaN%
undefined mm
```

Nếu thiếu dữ liệu, dùng:

```text
—
```

hoặc thông báo rõ.

## 8.5. Format số

Kiểm tra:

* `%` tối đa 2 chữ số thập phân.
* `mm` có khoảng trắng.
* Không hiện số dài.

Đúng:

```text
27.21%
60 mm
```

Sai:

```text
27.207657689834992%
60mm
```

## 8.6. React key

Nếu render list, key phải ổn định.

Không dùng key có thể undefined.

Không dùng index nếu list có search/filter/sort/reorder, trừ khi có lý do rõ.

## 8.7. State reset

Nếu có chuyển giữa phân công/trang/detail, kiểm tra:

* State cũ có bị giữ nhầm không.
* Loading có reset không.
* Error có reset không.
* Detail của mapc cũ có hiện nhầm sang mapc mới không.

## 8.8. Routing

Nếu thêm page mới, kiểm tra:

* Route đúng chưa.
* Link chuyển trang đúng chưa.
* Param có parse đúng không.
* `mapc` invalid có xử lý không.
* Có nút quay lại không.

## 8.9. Wording nghiệp vụ

Kiểm tra wording có đúng vai trò không.

Với Worker Proposal, tránh:

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

Với Admin:

```text
tối ưu cắt vật tư
tạo sơ đồ cắt
hỗ trợ ra quyết định
heuristic mặc định
```

---

# 9. Review Backend

Nếu task có sửa BE, Agent phải kiểm tra các điểm sau.

## 9.1. Input validation

Backend có validate:

* Required field
* Type
* Range
* Enum/status
* Quan hệ dữ liệu
* Quyền truy cập

không.

## 9.2. Không tin client

Backend không được tin:

```text
adminId
workerId
role
score
metrics
kerf
stockLength
```

Các thông tin này phải lấy từ token/session hoặc tự tính.

## 9.3. Error handling

Không được swallow error.

Sai:

```ts
try {
  ...
} catch (e) {
  console.log(e);
}
```

Đúng:

```ts
try {
  ...
} catch (error) {
  logger.error(error);
  throw new AppError("Không thể xử lý yêu cầu", 500);
}
```

## 9.4. HTTP status

Kiểm tra status code:

```text
400 input sai
401 chưa đăng nhập
403 không có quyền
404 không tìm thấy
409 xung đột trạng thái/stale
500 lỗi hệ thống
```

## 9.5. Consistency

Nếu ghi nhiều bảng, kiểm tra:

* Có transaction/RPC không.
* Nếu không có, có cleanup khi lỗi không.
* Có rủi ro dữ liệu mồ côi không.

Ví dụ:

```text
Insert proposal header thành công nhưng insert detail fail → proposal rỗng.
```

Nếu còn rủi ro, ghi P1 rõ ràng.

---

# 10. Review Database/Migration

Nếu task có sửa SQL/migration, Agent phải kiểm tra:

* Có được phép sửa migration không.
* Có chạy migration chưa.
* Có idempotent không.
* Có `IF NOT EXISTS` khi cần không.
* Có `DROP`, `TRUNCATE`, `DELETE` nguy hiểm không.
* Có ảnh hưởng dữ liệu thật không.
* Có rollback plan không.
* Có đụng migration deprecated không.

Không được tự nói migration pass nếu chưa chạy thật.

Nếu chưa chạy, ghi:

```text
Chưa chạy migration vì cần người dùng duyệt.
```

---

# 11. Review comment code

Agent phải kiểm tra comment đã đủ chưa.

## 11.1. Phải có comment ở logic quan trọng

Cần comment ở:

* Rule nghiệp vụ
* Auth/RBAC
* Validate quan trọng
* If/else trạng thái
* Tính toán cutting
* Mapping FE/BE dễ nhầm
* Edge case/null handling
* Transaction/cleanup
* Quyết định không làm gì để bảo vệ nghiệp vụ

## 11.2. Không comment thừa

Không cần comment dòng hiển nhiên như:

```ts
// Set loading true
setLoading(true);
```

## 11.3. Comment giải thích vì sao

Comment tốt giải thích lý do.

Ví dụ:

```ts
// Không cho tạo lại sơ đồ đã hoàn thành vì kho và nhật ký sản xuất có thể đã được cập nhật.
if (plan.status === "HOAN_THANH") {
  ...
}
```

Nếu thiếu comment ở logic quan trọng, Agent phải bổ sung nếu nằm trong phạm vi, hoặc báo rủi ro nếu không sửa.

---

# 12. Review nghiệp vụ Cutting Plan / Proposal

Nếu task liên quan cutting/proposal, Agent phải kiểm tra kỹ.

## 12.1. Tạo sơ đồ cắt

Đảm bảo:

* Admin tạo sơ đồ lý thuyết.
* Tạo sơ đồ không trừ kho.
* Kho chỉ trừ khi completePlan/flow hoàn thành cắt.
* Không tạo lại sơ đồ đã hoàn thành mà không cảnh báo/chặn.
* Không ghi đè dữ liệu quan trọng ngoài flow.

## 12.2. Worker Proposal

Đảm bảo:

* Worker không tự tối ưu lại bằng auto simulate như Admin.
* Worker nhập/chỉnh phương án cắt thực tế.
* Worker gửi proposal.
* Worker không sửa sơ đồ chính thức.
* Worker không approve/reject.
* FE không gửi score/metrics/kerf.
* Backend tự validate.

## 12.3. Admin Proposal

Đảm bảo:

* Admin xem proposal.
* Admin approve/reject.
* Approve/reject qua backend/RPC.
* FE không gửi adminId.
* Ghi chú dùng đúng field `ghichu`.
* Stale proposal trả EXPIRED/409 nếu có.

---

# 13. Review performance

Nếu task đụng UI list hoặc dữ liệu lớn, Agent phải kiểm tra:

* Có render toàn bộ 100+ item không.
* Có pagination/page size không.
* Search/filter có làm UI quá nặng không.
* Accordion có mở toàn bộ mặc định không.
* Có gọi API lặp nhiều lần không.
* Có N+1 request không.
* Có thể cache/memo đơn giản không.

Ví dụ trang `/admin/toi-uu-cat`:

```text
Nếu có 20-100 phân công, không nên render list/detail/sơ đồ tất cả trên cùng một trang.
Nên tách list/detail và dùng page size.
```

---

# 14. Review maintainability

Agent phải kiểm tra:

* Code có quá dài không.
* Có thể tách helper không.
* Tên biến/hàm rõ nghĩa không.
* Có duplicate logic không.
* Có magic number không.
* Có type/interface rõ không.
* Có comment giải thích rule không.
* Có dễ mở rộng không.

Không cần refactor lớn nếu ngoài phạm vi, nhưng phải báo nếu code đang khó bảo trì.

---

# 15. Review accessibility/basic UX

Nếu sửa UI, Agent nên kiểm tra:

* Button có text rõ không.
* Disabled button có lý do không.
* Form field có label không.
* Error message dễ hiểu không.
* Modal có thể đóng không.
* Table/card có dễ đọc không.
* Mobile có bị quá vỡ không.
* Text quá dài có làm layout vỡ không.

---

# 16. Phân loại lỗi sau review

Agent phải phân loại lỗi/rủi ro:

## P0 - Phải sửa trước khi bàn giao

Ví dụ:

* Build fail
* App crash
* Route thiếu auth/role
* Worker xem/sửa dữ liệu người khác
* Worker sửa sơ đồ chính thức
* FE gửi adminId/score/metrics/kerf
* Backend tin client dữ liệu nhạy
* Approve không qua RPC
* Trừ kho sai thời điểm
* Migration nguy hiểm
* Xóa dữ liệu thật

## P1 - Nên sửa sớm

Ví dụ:

* UI khó dùng
* Wording gây hiểu nhầm
* Thiếu pagination khi dữ liệu lớn
* Error handling kém
* Alert trình duyệt thay vì toast/modal
* Insert nhiều bảng không transaction
* Runtime flow chưa test thật
* Script dev mutate DB cần guard

## P2 - Có thể để sau

Ví dụ:

* Polish responsive
* Refactor component
* Animation
* Dashboard nâng cao
* Tối ưu giao diện nhỏ

---

# 17. Không được self-approve

Agent không được nói:

```text
Task đã pass hoàn toàn.
Bàn giao chắc chắn.
Không còn lỗi.
```

Agent chỉ được nói:

```text
Self-review không phát hiện P0.
Lint/build pass.
Sẵn sàng đưa reviewer/tester kiểm tra runtime.
Pass cuối cần tester xác nhận.
```

Nếu chưa runtime test, phải nói rõ:

```text
Chưa runtime test bằng tài khoản thật.
Cần tester kiểm tra theo checklist.
```

---

# 18. Output bắt buộc sau Self Review

Sau khi self-review, Agent phải báo cáo theo format:

```text
## 1. Phạm vi review
- File đã review:
- Module liên quan:

## 2. Scope review
- Có sửa đúng phạm vi không:
- Có sửa lan không:
- File ngoài kế hoạch nếu có:

## 3. Logic review
- Yêu cầu đã đáp ứng:
- Chưa đáp ứng:
- Có phá flow cũ không:

## 4. API contract review
- Có đổi API không:
- FE/BE có khớp không:
- Field nhạy cảm từ FE:

## 5. Security/RBAC review
- Admin route:
- Worker route:
- Data scope:

## 6. Frontend review
- Loading:
- Empty:
- Error:
- Fallback null/undefined:
- Format số:
- React key:
- Wording:

## 7. Backend review
- Input validation:
- Auth/role:
- Không tin client:
- Error handling:
- Transaction/consistency:

## 8. Comment review
- Comment logic quan trọng:
- Comment thừa:
- Cần bổ sung:

## 9. Business review
- Đúng nghiệp vụ:
- Rủi ro nghiệp vụ:

## 10. Performance/Maintainability
- Performance:
- Maintainability:

## 11. Lỗi/rủi ro còn lại
P0:
P1:
P2:

## 12. Kết luận self-review
- Có P0 không:
- Sẵn sàng đưa tester chưa:
- Cần tester kiểm tra gì:
- Có thể pass cuối chưa:
```

---

# 19. Ví dụ output đúng

```text
## 1. Phạm vi review
- File đã review:
  - FE/src/app/admin/toi-uu-cat/page.tsx
  - FE/src/app/admin/toi-uu-cat/[mapc]/page.tsx
- Module liên quan:
  - Admin tối ưu cắt vật tư

## 2. Scope review
- Có sửa đúng phạm vi: Có
- Có sửa lan: Không
- File ngoài kế hoạch: Không

## 3. Logic review
- Yêu cầu đã đáp ứng:
  - /admin/toi-uu-cat chuyển thành trang list.
  - /admin/toi-uu-cat/[mapc] hiển thị detail.
- Chưa đáp ứng:
  - Chưa có preview riêng trước khi lưu vì backend chưa có API preview.
- Có phá flow cũ: Không, logic tạo sơ đồ giữ nguyên.

## 4. API contract review
- Có đổi API: Không
- FE/BE có khớp: Có
- Field nhạy cảm từ FE: Không phát hiện

## 5. Security/RBAC review
- Không sửa route/auth.

## 6. Frontend review
- Loading: Có
- Empty: Có
- Error: Có
- Fallback null/undefined: Có
- Format số: Đã làm tròn %
- React key: Dùng mapc/masdc
- Wording: Đúng nghiệp vụ Admin

## 7. Backend review
- Không sửa BE.

## 8. Comment review
- Có comment ở đoạn giữ nguyên logic tạo sơ đồ vì Nhịp 1 chỉ tách UI.
- Không comment thừa dòng hiển nhiên.

## 9. Business review
- Đúng nghiệp vụ: Có
- Rủi ro: Cần tester kiểm tra tạo sơ đồ runtime.

## 10. Performance/Maintainability
- Performance: List có page size, không render tất cả detail.
- Maintainability: Tách page list/detail dễ mở rộng hơn.

## 11. Lỗi/rủi ro còn lại
P0: Không có
P1:
- Chưa runtime test bằng tài khoản thật.
P2:
- Có thể polish responsive sau.

## 12. Kết luận self-review
- Có P0: Không
- Sẵn sàng đưa tester: Có
- Cần tester kiểm tra:
  - Login Admin
  - Vào /admin/toi-uu-cat
  - Xem detail
  - Tạo sơ đồ
- Có thể pass cuối: Chưa, cần tester xác nhận.
```

---

# 20. Tiêu chuẩn hoàn thành Skill 04

Skill này được xem là làm đúng khi Agent:

* Review đúng phạm vi.
* Phát hiện sửa lan nếu có.
* Kiểm tra API contract.
* Kiểm tra RBAC nếu liên quan.
* Kiểm tra FE state/fallback/format.
* Kiểm tra backend validate/auth nếu liên quan.
* Kiểm tra comment logic quan trọng.
* Kiểm tra nghiệp vụ.
* Phân loại lỗi P0/P1/P2.
* Không tự pass cuối.
* Tạo kết luận rõ cho tester.

Skill này làm sai nếu Agent:

* Chỉ nói “đã review, ổn”.
* Không nêu rủi ro.
* Không kiểm API/RBAC khi có liên quan.
* Không phân loại P0/P1/P2.
* Không kiểm đúng yêu cầu ban đầu.
* Tự tuyên bố pass cuối khi chưa runtime test.

```
```
