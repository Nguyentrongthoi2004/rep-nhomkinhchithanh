# 02 Code Implementation

Có. Cái “bắt AI ghi comment cho code” nên đưa **ngay vào Skill 02: Code Implementation** luôn, vì nó thuộc quy tắc khi viết code.

Nhưng phải ghi đúng cách. Không phải dòng nào cũng comment, vì comment quá nhiều sẽ rối. Quy tắc tốt là:

```text
Comment vào đoạn có logic nghiệp vụ, if/else quan trọng, validate, phân quyền, tính toán, transaction, edge case.
Không comment mấy dòng hiển nhiên như setState, import, map đơn giản.
```

Bạn tạo file:

```text
D:\MiniERP_NhomKinh\.agent\skills\02-code-implementation.md
```

Dán nội dung này:

````markdown
# Skill 02: Code Implementation

Skill này quy định cách Agent được phép viết code sau khi đã hoàn thành Skill 01: Requirement Analysis.

Mục tiêu của skill này là đảm bảo Agent code đúng phạm vi, đúng nghiệp vụ, dễ đọc, dễ bảo trì, có comment ở các đoạn quan trọng, không sửa lan và không phá flow hiện có.

Agent chỉ được code khi đã:
- Hiểu rõ yêu cầu.
- Xác định phạm vi sửa.
- Đọc code liên quan.
- Chạy hoặc kiểm tra git status.
- Có kế hoạch sửa rõ ràng.

---

# 1. Nguyên tắc tổng quát khi code

Agent phải code như một senior engineering team.

Code không chỉ cần chạy được, mà phải:

- Đúng nghiệp vụ.
- Dễ đọc.
- Dễ review.
- Dễ test.
- Dễ bảo trì.
- Ít rủi ro phá module khác.
- Có xử lý edge case.
- Có comment cho logic quan trọng.
- Không giấu lỗi bằng cách bỏ qua validate.
- Không làm shortcut nguy hiểm.

Agent không được code theo kiểu “miễn build pass là xong”.

Lint/build pass chỉ là điều kiện kỹ thuật cơ bản, không phải pass nghiệp vụ.

---

# 2. Luật sửa đúng phạm vi

Agent chỉ được sửa các file đã nằm trong phạm vi được xác định ở Skill 01.

Ví dụ phạm vi là:

```text
FE/src/app/admin/toi-uu-cat/page.tsx
FE/src/app/admin/toi-uu-cat/[mapc]/page.tsx
FE/src/lib/api.ts nếu cần helper nhỏ
````

Agent không được tự ý sửa:

```text
BE/src/modules/...
supabase_scripts/...
FE/src/app/worker/...
```

nếu chưa được duyệt.

Nếu đang code mà phát hiện cần sửa thêm file ngoài phạm vi, Agent phải dừng và báo:

```text
Tôi phát hiện cần sửa thêm file X vì lý do Y.
Có được mở rộng phạm vi sửa không?
```

Không được âm thầm sửa lan.

---

# 3. Luật không đổi API contract nếu chưa báo

Agent không được tự ý đổi request/response giữa FE và BE.

Nếu cần đổi API contract, phải báo trước:

```text
API hiện tại:
POST /api/...
Body cũ:
{ ... }

Đề xuất body mới:
{ ... }

Lý do:
...

Ảnh hưởng:
- FE cần sửa ...
- BE cần sửa ...
```

Không được âm thầm đổi field.

Ví dụ lỗi đã từng gặp:

```text
FE gửi `admin_ghichu`
BE đọc `ghichu`
```

Agent phải kiểm tra kỹ để tránh lệch field.

---

# 4. Luật không fake dữ liệu

Agent không được hardcode dữ liệu giả vào production code.

Không fake:

* khách hàng
* đơn hàng
* worker
* phôi
* sơ đồ cắt
* proposal
* metrics
* warning
* trạng thái
* role

Nếu API chưa trả đủ dữ liệu, phải hiển thị thông báo rõ:

```text
Chưa có đủ dữ liệu để hiển thị.
```

hoặc:

```text
—
```

Không được tự bịa số liệu.

Ví dụ sai:

```tsx
const utilization = 95;
const warning = "Dữ liệu ổn";
```

Ví dụ đúng:

```tsx
const utilization = plan.metrics?.utilizationRate;

if (utilization == null) {
  return "—";
}
```

---

# 5. Luật comment code bắt buộc

Agent phải viết comment ở các đoạn code có logic quan trọng để người review, tester hoặc người bảo vệ đồ án hiểu code đang làm gì.

Tuy nhiên, comment phải đúng chỗ. Không comment lan man mọi dòng.

## 5.1. Bắt buộc comment ở các đoạn sau

Agent phải thêm comment cho:

1. Logic nghiệp vụ quan trọng.
2. Điều kiện `if/else` có ảnh hưởng tới quyền, trạng thái hoặc dữ liệu.
3. Validate input.
4. Auth/RBAC.
5. API call quan trọng.
6. Mapping field FE/BE dễ nhầm.
7. Tính toán cutting optimization:

   * kerf
   * safe margin
   * scrap
   * reusable length
   * utilization
   * waste
8. Proposal flow:

   * Worker submit
   * Admin approve/reject
   * stale/expired proposal
9. Transaction hoặc nhiều bước ghi DB.
10. Edge case/null handling.
11. Những đoạn tạm thời dùng API hiện tại vì chưa có API tốt hơn.
12. Những đoạn có quyết định “không làm gì” để bảo vệ nghiệp vụ.

## 5.2. Không cần comment ở các đoạn hiển nhiên

Không cần comment cho:

```tsx
import React from "react";
const [loading, setLoading] = useState(false);
items.map(...)
```

Không viết comment kiểu:

```tsx
// Set loading to true
setLoading(true);
```

Comment như vậy vô ích.

## 5.3. Comment phải giải thích “vì sao”, không chỉ “làm gì”

Comment tốt nên giải thích lý do.

Ví dụ tốt:

```ts
// Worker chỉ được xem proposal thuộc phân công của mình.
// Nếu không kiểm tra mapc theo worker, worker có thể xem dữ liệu của người khác.
if (mapc) {
  await ensureAssignmentBelongsToWorker(mapc, workerId);
}
```

Ví dụ không tốt:

```ts
// Check mapc
if (mapc) {
  ...
}
```

## 5.4. Comment cho if/else nghiệp vụ

Nếu `if/else` liên quan tới trạng thái nghiệp vụ, phải comment.

Ví dụ:

```ts
// Không cho tạo lại sơ đồ nếu sơ đồ đã hoàn thành,
// vì lúc này kho/thành phẩm có thể đã được cập nhật ở flow completePlan.
if (currentPlan.status === "HOAN_THANH") {
  throw new AppError("Sơ đồ đã hoàn thành, không thể tạo lại", 409);
}
```

Ví dụ:

```tsx
// Chỉ cho Admin duyệt proposal khi proposal còn ở trạng thái chờ duyệt.
// Các trạng thái đã duyệt/từ chối/hết hiệu lực không được thao tác lại.
const canApprove = proposal.trangthai === "CHO_DUYET";
```

## 5.5. Comment cho validate backend

Backend validate phải có comment ở các rule nghiệp vụ quan trọng.

Ví dụ:

```ts
// Backend tự tính tổng chiều dài theo từng phôi.
// Không tin chiều dài/metrics do FE gửi lên để tránh client gian lận hoặc dữ liệu sai.
const totalRequiredLength = calculateRequiredLength(cuts, bladeKerf, safeMargin);
```

Ví dụ:

```ts
// Phôi BO_DI không được dùng trong proposal vì đã bị loại khỏi kho khả dụng.
if (stock.trangthai === "BO_DI") {
  throw new AppError("Phôi đã bỏ đi, không thể sử dụng", 400);
}
```

## 5.6. Comment cho frontend mapping field

Nếu map field API dễ nhầm, phải comment.

Ví dụ:

```ts
// Backend approve/reject đọc field `ghichu`.
 // Không dùng `admin_ghichu` ở request body để tránh lệch schema FE/BE.
return api.post(`/admin/cutting-proposals/${id}/approve`, { ghichu: note });
```

## 5.7. Comment cho logic tạm thời

Nếu giải pháp hiện tại là tạm thời do thiếu API hoặc dữ liệu, phải comment rõ.

Ví dụ:

```tsx
// API hiện tại chưa có endpoint riêng cho preview sơ đồ cắt.
 // Nhịp 1 chỉ tách UI list/detail và giữ nguyên logic tạo sơ đồ đang có.
```

## 5.8. Comment không được che lỗi

Không được dùng comment để hợp thức hóa code sai.

Ví dụ sai:

```ts
// Tạm tin score từ FE cho nhanh
const score = req.body.score;
```

Nếu logic nguy hiểm, phải sửa hoặc báo rủi ro, không comment cho qua.

---

# 6. Luật code frontend

## 6.1. UI phải có state đầy đủ

Frontend page/component phải có:

* loading state
* empty state
* error state
* fallback khi dữ liệu thiếu

Không được để UI trắng hoặc crash khi API lỗi.

Ví dụ:

```tsx
if (loading) {
  return <LoadingState />;
}

if (error) {
  return <ErrorState message={error} />;
}

if (!items.length) {
  return <EmptyState message="Chưa có dữ liệu." />;
}
```

## 6.2. Không hiển thị null/undefined/NaN

Không để UI hiện:

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

## 6.3. Format số

Quy tắc:

```text
Tỷ lệ %: tối đa 2 chữ số thập phân
Đơn vị mm: có khoảng trắng
Không hiện số quá dài
```

Ví dụ đúng:

```text
27.21%
60 mm
```

Ví dụ sai:

```text
27.207657689834992%
60mm
```

Nên có helper:

```ts
function formatPercent(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatMm(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value)} mm`;
}
```

## 6.4. React key

Khi render list, key phải ổn định.

Ưu tiên:

```tsx
key={item.id ?? item.madxc ?? item.mapc}
```

Không dùng `index` nếu list có thể search/filter/sort/reorder.

Nếu bắt buộc dùng index, phải comment lý do.

## 6.5. Wording đúng nghiệp vụ

Agent phải tránh wording gây hiểu nhầm.

Với Worker Proposal, không dùng:

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

Với Admin tạo sơ đồ, có thể dùng:

```text
tối ưu cắt vật tư
tạo sơ đồ cắt
heuristic mặc định
hỗ trợ ra quyết định
```

---

# 7. Luật code backend

## 7.1. Backend phải validate input

Không được tin input từ frontend.

Phải validate:

* kiểu dữ liệu
* required field
* range
* trạng thái nghiệp vụ
* quyền truy cập
* quan hệ dữ liệu

Ví dụ:

```ts
// Không tin workerId từ client. Worker hiện tại phải lấy từ JWT/session.
const workerId = req.user!.mand;
```

## 7.2. Backend phải check auth/role

Route admin phải có:

```text
authMiddleware
requireRole("ADMIN")
```

Route worker phải có:

```text
authMiddleware
requireRole("WORKER")
```

Không để route nghiệp vụ public.

## 7.3. Backend không tin field nhạy cảm từ FE

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

Các field này phải lấy từ token hoặc tự tính lại.

## 7.4. Backend phải map HTTP status hợp lý

Gợi ý:

```text
200: thành công
201: tạo mới thành công
400: input sai
401: chưa đăng nhập
403: không có quyền
404: không tìm thấy
409: xung đột trạng thái / expired / stale
500: lỗi hệ thống
```

## 7.5. Backend phải có comment cho rule nghiệp vụ

Ví dụ:

```ts
// Proposal hết hiệu lực nếu sơ đồ đã bắt đầu cắt hoặc đã hoàn thành.
 // Khi đó không được thay sơ đồ chính thức để tránh sai lệch dữ liệu sản xuất.
if (planStatus === "DANG_CAT" || planStatus === "HOAN_THANH") {
  return { status: "EXPIRED" };
}
```

---

# 8. Luật với cutting/proposal code

Đây là module nhạy cảm, phải code cực kỳ cẩn thận.

## 8.1. Worker Proposal

Worker chỉ được:

* xem sơ đồ đang giao
* nhập/chỉnh phương án đề xuất
* gửi Admin duyệt

Worker không được:

* sửa sơ đồ chính thức
* approve proposal
* reject proposal
* trừ kho

## 8.2. Admin Proposal

Admin được:

* xem proposal
* duyệt proposal
* từ chối proposal

Approve/reject phải đi qua backend/RPC.

Frontend không được hard replace sơ đồ.

## 8.3. Không gửi metrics từ FE

FE không được gửi:

* score
* metrics
* kerf
* utilization
* waste

Backend tự tính lại.

## 8.4. Comment bắt buộc cho proposal/cutting logic

Mọi logic quan trọng trong cutting/proposal phải có comment.

Ví dụ:

```ts
// Tính kerf theo số nhát cắt để đảm bảo tổng chiều dài thực tế không vượt phôi.
const kerfLoss = cuts.length * bladeKerf;
```

Ví dụ:

```ts
// SAFE_MARGIN được trừ hai đầu phôi để tránh dùng hết chiều dài thực tế,
 // vì khi cắt ngoài xưởng có thể cần chừa mép an toàn.
const usableLength = stock.currentLength - safeMargin * 2;
```

Ví dụ:

```ts
// Không cập nhật kho khi tạo sơ đồ/proposal.
 // Kho chỉ được cập nhật khi Worker hoàn thành cắt qua completePlan.
```

---

# 9. Luật transaction và ghi nhiều bảng

Nếu một chức năng ghi nhiều bảng, Agent phải kiểm tra consistency.

Ví dụ:

```text
insert dexuatcat
insert chitietdexuatcat
```

Rủi ro:

```text
Insert header thành công nhưng insert detail lỗi.
```

Agent phải chọn một trong các hướng:

1. Dùng RPC/transaction.
2. Cleanup header nếu detail lỗi.
3. Nếu chưa sửa, báo rủi ro P1 rõ ràng.

Không được bỏ qua.

Comment bắt buộc:

```ts
// Header và detail phải nhất quán.
 // Nếu insert detail lỗi sau khi tạo header, cần cleanup để tránh proposal rỗng.
```

---

# 10. Luật error handling

Agent không được swallow error.

Không làm:

```ts
try {
  ...
} catch (e) {
  console.log(e);
}
```

Phải có xử lý:

```ts
try {
  ...
} catch (error) {
  logger.error(error);
  throw new AppError("Không thể tạo đề xuất cắt", 500);
}
```

Frontend phải hiển thị lỗi dễ hiểu:

```tsx
catch (error) {
  setError(getErrorMessage(error, "Không thể tải dữ liệu"));
}
```

Không được để user không biết chuyện gì xảy ra.

---

# 11. Luật đặt tên

Tên biến/hàm phải rõ nghĩa.

Không dùng tên mơ hồ:

```ts
data1
temp
abc
handleOk
doThing
```

Nên dùng:

```ts
assignmentList
selectedAssignment
proposalCuts
submitCuttingProposal
approveProposal
formatWasteLength
```

Với project này, nên giữ tên theo domain:

```text
mapc
madxc
mactdh
maphoi
sodocat
chitietcat
dexuatcat
```

Nếu dùng tên tiếng Anh bọc ngoài, phải map rõ.

---

# 12. Luật refactor

Agent không được refactor lớn nếu task không yêu cầu.

Được refactor nhỏ khi:

* Giúp code dễ đọc hơn.
* Không đổi logic.
* Không đổi API.
* Không làm phạm vi phình to.

Nếu muốn refactor lớn, phải báo trước.

---

# 13. Luật dependency

Không tự ý thêm package mới nếu chưa cần.

Nếu cần package mới, phải báo:

* package tên gì
* dùng để làm gì
* có thay thế bằng code hiện có được không
* ảnh hưởng bundle/build không

Không thêm package chỉ để làm việc đơn giản.

---

# 14. Luật bảo mật

Không được:

* log token
* log service role key
* expose env secret ra frontend
* gửi secret qua response
* hardcode key vào code
* lưu secret trong localStorage nếu không cần

Frontend chỉ được dùng biến public:

```text
NEXT_PUBLIC_...
```

Backend giữ secret server-side.

---

# 15. Luật sau khi code xong

Sau khi code, Agent phải:

1. Chạy lint/build phù hợp.
2. Tự review code.
3. Báo cáo file đã sửa.
4. Báo cáo logic thay đổi.
5. Báo cáo API có đổi không.
6. Báo cáo DB/migration có đụng không.
7. Báo cáo rủi ro còn lại.
8. Viết checklist runtime cho tester.

Không được nói task pass cuối nếu chưa có tester xác nhận.

---

# 16. Output bắt buộc sau khi implement

Sau khi code, Agent phải trả lời theo format:

```text
## 1. File đã sửa
- ...

## 2. Logic đã thay đổi
- Trước:
- Sau:

## 3. Comment đã thêm
- Đã comment các đoạn nghiệp vụ:
  - ...
- Không comment các dòng hiển nhiên.

## 4. API contract
- Có đổi không:
- Nếu có, đổi gì:

## 5. Database/Migration
- Có đụng không:

## 6. Lint/build
- FE lint:
- FE build:
- BE lint:
- BE build:

## 7. Self-review
- Đạt:
- Rủi ro:

## 8. Checklist runtime
- ...

## 9. Kết luận
- Sẵn sàng đưa reviewer/tester kiểm tra chưa:
- Có thể pass cuối chưa:
```

---

# 17. Ví dụ code comment tốt

## Ví dụ 1: Role check

```ts
// Route này chỉ dành cho Worker vì dữ liệu proposal được scope theo phân công của worker.
// Không cho ADMIN dùng route legacy worker để tránh lệch RBAC và nhầm context.
router.get(
  "/worker/cutting-plans/proposals",
  authMiddleware,
  requireRole("WORKER"),
  controller.listWorkerProposals
);
```

## Ví dụ 2: FE không gửi adminId

```ts
// Backend lấy admin id từ JWT/session.
 // FE chỉ gửi ghi chú để tránh client giả mạo adminId.
export function approveCuttingProposal(id: number, note: string) {
  return api.post(`/admin/cutting-proposals/${id}/approve`, {
    ghichu: note,
  });
}
```

## Ví dụ 3: Cutting length

```ts
// Tổng chiều dài cần dùng phải cộng cả hao lưỡi cắt và safe margin.
 // Nếu không tính phần này, phương án có thể hợp lệ trên UI nhưng không cắt được ngoài xưởng.
const requiredLength = totalCutLength + cuts.length * bladeKerf + safeMargin * 2;
```

## Ví dụ 4: Không tạo lại sơ đồ hoàn thành

```ts
// Sơ đồ đã hoàn thành không được tạo lại vì kho và nhật ký sản xuất đã có thể thay đổi.
 // Nếu muốn thay đổi, phải đi qua flow nghiệp vụ riêng thay vì ghi đè trực tiếp.
if (plan.status === "HOAN_THANH") {
  throw new AppError("Không thể tạo lại sơ đồ đã hoàn thành", 409);
}
```

## Ví dụ 5: Fallback UI

```tsx
// API cũ không phải lúc nào cũng trả tên khách hàng.
 // Dùng fallback để UI không hiện undefined và vẫn cho Admin nhận diện phân công.
const customerName = assignment.customerName ?? "Chưa có tên khách hàng";
```

---

# 18. Ví dụ comment không tốt

Không viết comment kiểu này:

```ts
// Declare variable
const x = 1;

// Check if loading
if (loading) {
  ...
}

// Map items
items.map(...)
```

Lý do: các comment này không giải thích nghiệp vụ hoặc rủi ro.

---

# 19. Tiêu chuẩn hoàn thành Skill 02

Một lần implement được xem là đúng Skill 02 khi:

* Sửa đúng phạm vi.
* Không sửa lan.
* Không đổi API ngầm.
* Không fake data.
* Có comment ở logic quan trọng.
* Không comment thừa dòng hiển nhiên.
* Có loading/empty/error nếu sửa UI.
* Có validate nếu sửa backend.
* Không tin client ở field nhạy.
* Lint/build pass hoặc báo lỗi rõ.
* Có self-review và handoff report.

Comment vào đoạn có logic nghiệp vụ, if/else quan trọng, validate, phân quyền, tính toán, transaction, edge case.
Không comment mấy dòng hiển nhiên như setState, import, map đơn giản.

````

---

