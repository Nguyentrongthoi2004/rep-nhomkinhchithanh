# 01 Requirement Analysis

Được. Skill đầu tiên nên là **Requirement Analysis** — bắt AI **phân tích yêu cầu trước khi code**, tránh lao vào sửa bừa.

Tạo file:

```text
D:\MiniERP_NhomKinh\.agent\skills\01-requirement-analysis.md
```

Dán nội dung này:

````markdown
# Skill 01: Requirement Analysis

Skill này bắt buộc Agent phải dùng khi nhận bất kỳ task mới nào.

Mục tiêu của skill này là giúp Agent hiểu đúng yêu cầu, xác định đúng phạm vi, nhận diện rủi ro và lập kế hoạch trước khi code.

Agent không được code ngay khi chưa hoàn thành bước phân tích yêu cầu.

---

# 1. Vai trò của skill

Khi người dùng giao task, Agent phải đóng vai một senior engineering team đang phân tích yêu cầu trước khi implement.

Agent phải suy nghĩ từ nhiều góc nhìn:

- Góc nhìn nghiệp vụ
- Góc nhìn frontend
- Góc nhìn backend
- Góc nhìn database
- Góc nhìn security/RBAC
- Góc nhìn QA/tester
- Góc nhìn maintainability
- Góc nhìn mở rộng về sau

Agent không chỉ hỏi:

> Code cái này như nào?

Mà phải hỏi:

> Yêu cầu này có đúng nghiệp vụ không?  
> Có phá flow cũ không?  
> Có cần sửa FE/BE/DB không?  
> Có rủi ro dữ liệu không?  
> Có cần hỏi lại trước khi làm không?

---

# 2. Khi nào phải dùng skill này?

Phải dùng skill này trong mọi trường hợp:

- Thêm chức năng mới
- Sửa bug
- Refactor UI
- Sửa API
- Sửa database/migration
- Sửa workflow nghiệp vụ
- Sửa wording nếu có thể ảnh hưởng nghiệp vụ
- Audit code
- Runtime test
- Viết tài liệu kỹ thuật
- Deploy/config

Không được bỏ qua skill này chỉ vì task nhìn có vẻ nhỏ.

Ví dụ task nhỏ như:

> Đổi chữ “tối ưu mới” thành “đề xuất điều chỉnh”

Vẫn phải hiểu vì sao đổi:

- Tránh hiểu nhầm Worker tự tối ưu lại.
- Đúng nghiệp vụ hơn: Worker đề xuất phương án thực tế, Admin duyệt.

---

# 3. Quy trình phân tích yêu cầu bắt buộc

Khi nhận task, Agent phải làm theo thứ tự sau.

---

## Bước 1: Viết lại yêu cầu bằng ngôn ngữ kỹ thuật

Agent phải tóm tắt lại yêu cầu.

Ví dụ người dùng nói:

> Trang tối ưu cắt vật tư dài quá, tách ra 2 trang.

Agent phải viết lại:

```text
Yêu cầu kỹ thuật:
Tách trang Admin `/admin/toi-uu-cat` hiện đang gom danh sách phân công và chi tiết sơ đồ cắt thành 2 route:
- `/admin/toi-uu-cat`: danh sách phân công cắt
- `/admin/toi-uu-cat/[mapc]`: chi tiết một phân công

Mục tiêu:
- Giảm độ dài trang
- Dễ tìm kiếm khi có nhiều phân công
- Tránh render quá nhiều dữ liệu một lúc
- Giữ nguyên logic tạo sơ đồ cắt hiện tại
````

Nếu không thể viết lại rõ ràng, Agent phải hỏi lại người dùng.

---

## Bước 2: Xác định loại task

Agent phải phân loại task thuộc nhóm nào:

* FE only
* BE only
* Full-stack
* Database/migration
* Runtime test
* Audit only
* Documentation only
* Deployment/config
* Mixed/unclear

Ví dụ:

```text
Loại task: FE only
Lý do: yêu cầu chỉ tách UI trang `/admin/toi-uu-cat`, chưa yêu cầu đổi API/backend.
```

Nếu chưa chắc là FE only hay cần backend, Agent phải nói rõ:

```text
Tạm đánh giá là FE only, nhưng cần đọc `FE/src/lib/api.ts` và API hiện tại để xác nhận có đủ dữ liệu không.
```

---

## Bước 3: Xác định module liên quan

Agent phải liệt kê module liên quan.

Ví dụ với task tối ưu cắt vật tư:

```text
Module liên quan:
- Admin Tối ưu cắt vật tư
- Phân công
- Sơ đồ cắt
- BOM/chi tiết đơn hàng
- Kho phôi nếu trang đang hiển thị phôi khả dụng
```

Ví dụ với task Worker Proposal:

```text
Module liên quan:
- Worker cắt
- Worker Proposal
- Admin Proposal
- Cutting Plans
- RPC approve/reject proposal
- RBAC ADMIN/WORKER
```

---

## Bước 4: Xác định file cần đọc trước khi code

Agent phải liệt kê file cần đọc.

Ví dụ:

```text
File cần đọc:
- FE/src/app/admin/toi-uu-cat/page.tsx
- FE/src/lib/api.ts
- BE/src/modules/cutting-plans/cutting-plans.routes.ts nếu cần kiểm API
- BE/src/modules/cutting-plans/cutting-plans.service.ts nếu cần kiểm logic tạo sơ đồ
```

Không được code nếu chưa đọc file chính liên quan.

---

## Bước 5: Chạy hoặc kiểm tra Git status

Trước khi sửa, Agent phải chạy:

```bash
git status --short
git diff --stat
git diff --name-only
```

Agent phải báo:

```text
Git status:
- Repo sạch
```

hoặc:

```text
Git status:
- Có file modified:
  - ...
Cần cẩn thận để không ghi đè thay đổi hiện có.
```

Nếu có thay đổi ngoài phạm vi, Agent phải cảnh báo.

Không được tự reset/revert.

---

## Bước 6: Xác định phạm vi được sửa

Agent phải ghi rõ:

```text
Phạm vi được sửa:
- File A
- File B
```

Ví dụ:

```text
Phạm vi dự kiến:
- Sửa `FE/src/app/admin/toi-uu-cat/page.tsx`
- Tạo `FE/src/app/admin/toi-uu-cat/[mapc]/page.tsx`
- Có thể sửa `FE/src/lib/api.ts` nếu cần helper nhỏ
```

---

## Bước 7: Xác định phạm vi không được sửa

Agent phải ghi rõ những thứ không được đụng.

Ví dụ:

```text
Không sửa:
- Backend nếu API hiện tại đủ dùng
- Migration
- RPC proposal
- completePlan
- Worker Proposal
- Upload ảnh
- Dashboard
- Kho phôi
- Order/payment/customer
```

Với task proposal:

```text
Không sửa:
- Flow trừ kho
- completePlan
- Migration 15
- RPC approve/reject nếu không được yêu cầu
- Không cho Worker sửa sơ đồ chính thức
```

---

## Bước 8: Xác định API contract có thể bị ảnh hưởng không

Agent phải trả lời:

```text
Có đổi API contract không?
- Không, nếu chỉ sửa UI.
```

Hoặc:

```text
Có thể cần đổi API contract nếu API hiện tại không trả đủ dữ liệu BOM/phôi.
Cần kiểm tra trước khi quyết định.
```

Nếu đổi API, Agent phải báo rõ:

* Request cũ
* Request mới
* Response cũ
* Response mới
* FE/BE nào bị ảnh hưởng
* Có cần migration không

Không được âm thầm đổi API.

---

## Bước 9: Xác định có cần migration/database không

Agent phải trả lời rõ:

```text
Có cần migration không?
- Không.
```

Nếu có khả năng cần migration:

```text
Có thể cần migration nếu cần thêm field trạng thái mới.
Hiện tại chưa được phép chạy migration. Cần báo phương án và chờ duyệt.
```

Không được tự chạy migration.

---

## Bước 10: Phân tích rủi ro

Agent phải liệt kê rủi ro trước khi code.

Các nhóm rủi ro cần kiểm tra:

### Rủi ro nghiệp vụ

Ví dụ:

```text
- Worker Proposal không được biến thành auto simulate giống Admin.
- Admin không được tạo lại sơ đồ khi sơ đồ đã hoàn thành mà không cảnh báo.
- Worker không được sửa sơ đồ chính thức.
```

### Rủi ro frontend

```text
- State cũ của phân công này có thể bị hiển thị nhầm sang phân công khác.
- List dài có thể render nặng.
- Thiếu loading/error/empty state.
- Null field có thể làm crash UI.
```

### Rủi ro backend

```text
- API có thể không filter đúng theo mapc.
- Role guard có thể chưa chặt.
- Backend có thể đang tin client field nhạy.
```

### Rủi ro database

```text
- Ghi nhiều bảng không transaction.
- Script test có thể mutate DB thật.
- Migration có thể không idempotent.
```

### Rủi ro security/RBAC

```text
- Worker có thể xem phân công người khác.
- Admin route có thể thiếu ADMIN guard.
- FE có thể gửi adminId.
```

---

## Bước 11: Phân loại mức độ rủi ro

Agent phải phân loại nếu phát hiện vấn đề:

```text
P0 - Nghiêm trọng, phải sửa trước khi bàn giao
P1 - Nên sửa sớm
P2 - Có thể để sau
```

Ví dụ:

```text
P0:
- Không có.

P1:
- Trang `/admin/toi-uu-cat` không có pagination, dễ dài khi dữ liệu lớn.
- Worker proposal nhập raw ID, khó dùng.

P2:
- Alert UI chưa đẹp.
```

---

## Bước 12: Lập plan trước khi code

Agent phải đưa plan ngắn.

Ví dụ:

```text
Kế hoạch:
1. Đọc trang `/admin/toi-uu-cat/page.tsx` để hiểu data shape hiện tại.
2. Giữ route `/admin/toi-uu-cat` làm trang list.
3. Tạo route `/admin/toi-uu-cat/[mapc]` làm trang detail.
4. Tái sử dụng logic tạo sơ đồ hiện tại ở trang detail.
5. Không đổi backend nếu API hiện tại đủ.
6. Chạy `cd FE && npm run lint && npm run build`.
7. Self-review và báo checklist runtime.
```

Không được code nếu chưa có plan.

---

# 4. Khi nào Agent phải hỏi lại người dùng?

Agent phải hỏi lại nếu gặp một trong các trường hợp:

## 4.1. Yêu cầu mơ hồ

Ví dụ:

> sửa cho đẹp

Agent phải hỏi:

```text
Bạn muốn sửa phần nào: layout, màu sắc, wording, responsive, hay flow nghiệp vụ?
```

## 4.2. Yêu cầu có nguy cơ phá nghiệp vụ

Ví dụ:

> Cho Worker duyệt luôn proposal khỏi cần Admin.

Agent phải phản biện:

```text
Yêu cầu này phá mô hình phân quyền hiện tại. Worker không nên duyệt proposal của chính mình. Nên giữ Admin là người duyệt cuối.
```

## 4.3. Cần migration/database

Agent phải hỏi trước nếu cần:

* thêm bảng
* thêm cột
* sửa enum
* chạy SQL
* rollback
* delete dữ liệu

## 4.4. Cần sửa ngoài phạm vi

Nếu đang sửa FE mà phát hiện phải sửa BE, Agent phải dừng:

```text
Phát hiện cần sửa backend vì API hiện tại không trả `mapc`. Có thể sửa BE không?
```

## 4.5. Có nhiều phương án nghiệp vụ

Agent phải đưa lựa chọn.

Ví dụ:

```text
Có 2 hướng:
1. Chỉ sửa UI dùng API hiện tại.
2. Thêm API detail riêng cho hiệu năng tốt hơn.

Tôi đề xuất hướng 1 cho Nhịp 1 vì ít rủi ro.
```

---

# 5. Những điều Agent phải tự phán đoán

Agent không được làm máy móc.

Agent phải tự phán đoán nếu yêu cầu có dấu hiệu bất hợp lý.

Ví dụ:

## 5.1. Worker Proposal auto simulate

Nếu yêu cầu hoặc UI khiến Worker chỉ bấm auto simulate rồi gửi Admin, Agent phải nhận ra:

```text
Rủi ro nghiệp vụ:
Luồng này vô lý vì Admin ban đầu cũng dùng hệ thống tạo sơ đồ cắt. Nếu hệ thống tự tìm phương án tốt hơn, Admin đáng lẽ đã dùng ngay. Worker Proposal nên là phương án thực tế do Worker nhập/chỉnh dựa trên quan sát tại xưởng.
```

## 5.2. Trang list quá dài

Nếu UI render list/detail chung một trang, Agent phải nhận ra:

```text
Rủi ro mở rộng:
Khi có 20-100 phân công, trang sẽ dài, khó tìm, render nặng. Nên tách list/detail và thêm search/filter/pagination.
```

## 5.3. Backend tin client

Nếu FE gửi field như `score`, `metrics`, `kerf`, Agent phải nhận ra:

```text
Rủi ro bảo mật/nghiệp vụ:
Backend không được tin các field này từ client. Backend phải tự tính.
```

## 5.4. Lint/build pass chưa đủ

Nếu chỉ có lint/build pass, Agent không được kết luận pass cuối.

Phải nói:

```text
Lint/build pass, nhưng cần runtime test bằng tài khoản thật để xác nhận flow nghiệp vụ.
```

---

# 6. Output bắt buộc của skill này

Sau khi phân tích yêu cầu, trước khi code, Agent phải trả lời theo format:

```text
## 1. Tôi hiểu yêu cầu là
...

## 2. Loại task
FE only / BE only / Full-stack / Audit only / Runtime test / Database / Mixed

## 3. Module liên quan
- ...

## 4. File cần đọc
- ...

## 5. Git status
- Repo sạch / Có file modified

## 6. Phạm vi dự kiến sửa
- ...

## 7. Không sửa
- ...

## 8. API contract
- Có đổi không?
- Nếu có, đổi gì?

## 9. Database/Migration
- Có cần không?

## 10. Rủi ro
P0:
P1:
P2:

## 11. Kế hoạch
1. ...
2. ...
3. ...

## 12. Cần hỏi lại không?
- Không, có thể triển khai.
hoặc
- Có, cần người dùng xác nhận ...
```

---

# 7. Ví dụ output đúng

## Ví dụ 1: Task tách trang tối ưu cắt

```text
## 1. Tôi hiểu yêu cầu là
Tách trang `/admin/toi-uu-cat` thành list/detail để tránh UI dài khi có nhiều phân công.

## 2. Loại task
FE only ở Nhịp 1.

## 3. Module liên quan
- Admin tối ưu cắt vật tư
- Phân công
- Sơ đồ cắt

## 4. File cần đọc
- FE/src/app/admin/toi-uu-cat/page.tsx
- FE/src/lib/api.ts

## 5. Git status
Sẽ chạy trước khi sửa.

## 6. Phạm vi dự kiến sửa
- FE/src/app/admin/toi-uu-cat/page.tsx
- FE/src/app/admin/toi-uu-cat/[mapc]/page.tsx
- FE/src/lib/api.ts nếu cần helper nhỏ

## 7. Không sửa
- Backend
- Migration
- RPC
- Worker Proposal
- completePlan

## 8. API contract
Chưa dự kiến đổi API.

## 9. Database/Migration
Không cần.

## 10. Rủi ro
P0: chưa thấy.
P1: API hiện tại có thể thiếu dữ liệu detail.
P2: cần polish responsive sau.

## 11. Kế hoạch
1. Đọc code hiện tại.
2. Tách list/detail.
3. Giữ logic tạo sơ đồ.
4. Chạy FE lint/build.
5. Self-review.

## 12. Cần hỏi lại không?
Không, có thể triển khai Nhịp 1 nếu API hiện tại đủ.
```

---

## Ví dụ 2: Task sửa Worker Proposal

```text
## 1. Tôi hiểu yêu cầu là
Sửa Worker Proposal để không còn giống auto simulate lại như Admin, mà là Worker nhập/chỉnh phương án cắt thực tế.

## 2. Loại task
Full-stack nhẹ hoặc FE-first, cần kiểm tra BE payload.

## 3. Module liên quan
- Worker cắt
- Worker Proposal
- Admin Proposal
- Cutting Plans

## 4. File cần đọc
- FE/src/components/worker/ProposalSubmitModal.tsx
- FE/src/app/worker/cat/page.tsx
- FE/src/lib/api.ts
- BE/src/modules/cutting-plans/cutting-plans.service.ts

## 5. Git status
Sẽ chạy trước khi sửa.

## 6. Phạm vi dự kiến sửa
- Ưu tiên FE modal
- Có thể cần FE api mapping
- Không sửa RPC

## 7. Không sửa
- Migration
- RPC approve/reject
- completePlan
- flow trừ kho

## 8. API contract
Chưa đổi. Nếu backend đang yêu cầu field `simulatedBars`, có thể dùng field đó nhưng semantic là proposedBars do Worker nhập.

## 9. Database/Migration
Không cần.

## 10. Rủi ro
P0: nếu Worker sửa sơ đồ chính thức là sai.
P1: wording auto simulate gây sai nghiệp vụ.
P1: nhập raw ID khó dùng.
P2: UI cần polish.

## 11. Kế hoạch
1. Đọc modal hiện tại.
2. Đảm bảo Worker có thể nhập/chỉnh phôi/nhát cắt.
3. Đổi wording.
4. Không gửi score/metrics/kerf.
5. Chạy lint/build.

## 12. Cần hỏi lại không?
Không nếu chỉ sửa FE wording/flow. Có nếu cần đổi backend payload.
```

---

# 8. Tiêu chuẩn đánh giá skill này hoàn thành tốt

Skill này được xem là làm đúng khi Agent:

* Không code ngay.
* Hiểu đúng yêu cầu.
* Nhận ra module liên quan.
* Nhận ra rủi ro nghiệp vụ.
* Biết file cần đọc.
* Biết phạm vi không được sửa.
* Có plan rõ.
* Biết khi nào cần hỏi lại.
* Không kết luận bừa.

Skill này làm sai nếu Agent:

* Code ngay không phân tích.
* Sửa lan.
* Không chạy git status.
* Không đọc file liên quan.
* Không nêu rủi ro.
* Không phân biệt FE/BE/DB.
* Làm theo yêu cầu sai nghiệp vụ một cách máy móc.

```

```
