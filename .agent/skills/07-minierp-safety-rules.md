# 07 MiniERP Safety Rules

Không, Skill 7 phải dài hơn nhiều. Đoạn trên mới là phần mở đầu. Bản đầy đủ nên như này:

````markdown
# Skill 07: MiniERP Safety Rules

Skill này quy định các luật an toàn bắt buộc khi Agent làm việc với dự án Mini-ERP Nhôm Kính.

Mục tiêu của skill này là ngăn Agent phá dữ liệu, phá flow nghiệp vụ, sửa lan module quan trọng, chạy migration nguy hiểm, làm sai phân quyền hoặc tạo ra code có rủi ro bảo mật.

Skill này có độ ưu tiên cao.  
Nếu yêu cầu của người dùng mâu thuẫn với Safety Rules, Agent phải dừng lại, giải thích rủi ro và đề xuất phương án an toàn hơn.

---

# 1. Nguyên tắc an toàn tổng quát

Agent phải ưu tiên:

- An toàn dữ liệu
- Đúng nghiệp vụ
- Đúng phân quyền
- Không sửa lan
- Không chạy lệnh nguy hiểm
- Không phá flow đang hoạt động
- Không tin dữ liệu từ client
- Không tự quyết định pass cuối
- Không che giấu lỗi

Agent không được làm theo yêu cầu một cách máy móc nếu yêu cầu đó có nguy cơ phá hệ thống.

Ví dụ:

```text
Yêu cầu: Cho Worker duyệt luôn proposal của chính mình.
Phản hồi đúng: Không nên làm vì phá phân quyền. Worker chỉ được gửi proposal, Admin mới duyệt.
````

---

# 2. Những vùng rủi ro cao trong dự án

Agent phải đặc biệt cẩn thận với các vùng sau:

```text
Database / Supabase
Migration
RPC approve/reject proposal
completePlan
Trừ kho
Sơ đồ cắt chính thức
Worker Proposal
Admin Proposal
Auth / RBAC
Service role key
Upload ảnh / Storage
Deploy production
```

Nếu task đụng một trong các vùng trên, Agent phải phân tích kỹ hơn, self-review kỹ hơn và không được sửa nhanh theo cảm tính.

---

# 3. Luật Database / Supabase

Database là vùng rủi ro cao.

Agent không được tự ý:

* Drop table
* Truncate table
* Delete dữ liệu thật
* Update hàng loạt dữ liệu thật
* Rollback migration
* Chạy migration chưa được duyệt
* Chạy script mutate DB thật
* Sửa enum/trạng thái DB nếu chưa được yêu cầu
* Sửa RLS policy nếu chưa phân tích tác động
* Tắt RLS
* Dùng service role sai chỗ
* Expose service role key ra frontend

## 3.1. Không được chạy lệnh nguy hiểm

Không được tự ý chạy:

```sql
DROP TABLE ...
TRUNCATE TABLE ...
DELETE FROM ...
UPDATE ... -- không có WHERE rõ ràng
ALTER TYPE ... DROP VALUE
DROP FUNCTION ...
DROP POLICY ...
DISABLE ROW LEVEL SECURITY
```

Nếu thật sự cần, Agent phải:

1. Báo lý do.
2. Báo rủi ro.
3. Đề xuất backup.
4. Đề xuất chạy trên DB dev trước.
5. Chờ người dùng duyệt.

## 3.2. Không mutate dữ liệu thật khi test

Nếu script test có insert/update/delete DB, bắt buộc phải có guard:

```ts
if (process.env.ALLOW_DEV_DB_MUTATION !== "true") {
  throw new Error(
    "Script này có mutation DB. Set ALLOW_DEV_DB_MUTATION=true nếu chắc chắn đang chạy trên DB dev."
  );
}
```

Agent không được chạy script mutate DB nếu:

* Chưa có guard.
* Chưa được người dùng cho phép.
* Không chắc đang chạy DB dev.
* Không biết script sẽ thay đổi bảng nào.

---

# 4. Luật Migration

Migration phải được xử lý cực kỳ cẩn thận.

Agent không được tự chạy migration nếu chưa được duyệt.

## 4.1. Migration 14

Migration 14 đã deprecated.

Không được chạy:

```text
supabase_scripts/14_proposals_and_rules_DEPRECATED_DO_NOT_RUN.sql
```

Nếu thấy file migration 14, chỉ được xem như tài liệu cũ.

Không được copy logic từ migration 14 sang migration mới nếu chưa kiểm tra.

## 4.2. Migration 15

Migration 15 là nền chính thức cho proposal/RPC.

Không được tự ý:

* Rollback migration 15
* Drop bảng do migration 15 tạo
* Drop RPC approve/reject
* Sửa function approve/reject nếu chưa được yêu cầu
* Xóa policy RLS liên quan proposal
* Đổi enum/trạng thái proposal nếu chưa phân tích

Nếu cần thay đổi liên quan migration 15, phải tạo migration mới, không sửa trực tiếp migration đã chạy.

## 4.3. Yêu cầu với migration mới

Nếu cần tạo migration mới, Agent phải đảm bảo:

* Có lý do rõ ràng.
* Có phạm vi rõ ràng.
* SQL càng idempotent càng tốt.
* Có `IF NOT EXISTS` nếu phù hợp.
* Không phá dữ liệu cũ.
* Có rollback plan.
* Có test plan.
* Chờ duyệt trước khi chạy.

Ví dụ an toàn:

```sql
CREATE TABLE IF NOT EXISTS ...
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
CREATE INDEX IF NOT EXISTS ...
```

Ví dụ nguy hiểm:

```sql
DROP TABLE ...
TRUNCATE ...
DELETE FROM ...
ALTER TABLE ... DROP COLUMN ...
```

---

# 5. Luật Auth / RBAC

Hệ thống có hai role chính:

```text
ADMIN
WORKER
```

Agent phải đảm bảo phân quyền rõ ràng.

## 5.1. Route Admin

Route Admin phải có:

```text
authMiddleware
requireRole("ADMIN")
```

Admin được phép:

* Quản lý đơn hàng
* Quản lý khách hàng
* Quản lý kho
* Quản lý phân công
* Tạo sơ đồ cắt
* Xem proposal
* Duyệt proposal
* Từ chối proposal
* Xử lý sự cố

## 5.2. Route Worker

Route Worker phải có:

```text
authMiddleware
requireRole("WORKER")
```

Worker được phép:

* Xem phân công của mình
* Xem sơ đồ cắt được giao
* Cập nhật tiến độ cắt nếu flow cho phép
* Báo sự cố
* Gửi đề xuất điều chỉnh phương án cắt

Worker không được:

* Xem phân công của worker khác
* Sửa sơ đồ chính thức
* Duyệt proposal
* Từ chối proposal
* Trừ kho trực tiếp
* Tạo sơ đồ chính thức như Admin
* Gửi `workerId` để giả danh người khác

## 5.3. Không tin role từ frontend

Backend không được tin:

```text
role
adminId
workerId
mand
```

nếu field đó do client gửi lên.

Backend phải lấy user từ token/session:

```ts
const userId = req.user!.mand;
const role = req.user!.role;
```

Nếu FE gửi `adminId` hoặc `workerId`, backend không được dùng field đó để xác định quyền.

---

# 6. Luật bảo mật secret/env

Agent không được:

* Hardcode secret vào code.
* Log token.
* Log service role key.
* Expose service role key ra frontend.
* Trả secret trong API response.
* Đưa secret vào commit.
* Dùng `NEXT_PUBLIC_` cho secret backend.

## 6.1. Frontend env

Frontend chỉ được dùng env public:

```text
NEXT_PUBLIC_...
```

Các biến này có thể bị người dùng nhìn thấy trong browser.

Không đặt secret vào `NEXT_PUBLIC_`.

## 6.2. Backend env

Backend được dùng secret server-side:

```text
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
DATABASE_URL
```

Các biến này không được gửi sang FE.

## 6.3. Supabase service role

Service role chỉ được dùng ở backend.

Không bao giờ dùng service role trong:

```text
FE/src/...
browser code
client component
localStorage
public env
```

Nếu phát hiện service role trong FE, đánh dấu P0.

---

# 7. Luật Git an toàn

Agent không được tự ý chạy:

```bash
git reset
git reset --hard
git checkout .
git clean -fd
git revert
git push --force
```

Không được tự ý xóa file hoặc revert thay đổi người khác.

Trước khi sửa code, Agent phải kiểm tra:

```bash
git status --short
git diff --stat
git diff --name-only
```

Nếu repo có nhiều file modified ngoài phạm vi, Agent phải cảnh báo:

```text
Repo đang có thay đổi ngoài phạm vi. Cần cẩn thận để không ghi đè.
```

Agent có thể đề xuất commit message, nhưng không được tự push nếu chưa được yêu cầu.

---

# 8. Luật Frontend an toàn

## 8.1. Không gửi field nhạy cảm

Frontend không được gửi:

```text
adminId
workerId
role
score
metrics
kerf
utilization
waste
service_role_key
```

Backend phải tự lấy user từ token và tự tính metrics.

## 8.2. Không fake dữ liệu production

Frontend không được hardcode:

* khách hàng
* worker
* đơn hàng
* phôi
* sơ đồ cắt
* proposal
* trạng thái
* metrics

Nếu API thiếu dữ liệu, UI phải fallback:

```text
—
```

hoặc:

```text
Chưa có đủ dữ liệu để hiển thị.
```

## 8.3. Không để UI crash vì null

UI phải xử lý:

```text
null
undefined
NaN
empty array
API error
loading
```

Không được hiện:

```text
undefined
null
NaN
NaN%
undefined mm
```

## 8.4. Không đổi flow bằng wording sai

Wording phải đúng nghiệp vụ.

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

---

# 9. Luật Backend an toàn

Backend phải:

* Validate input
* Check auth
* Check role
* Check data scope
* Không tin client
* Không expose secret
* Không mutate DB ngoài nghiệp vụ
* Map lỗi rõ ràng
* Không swallow error
* Không trả stack trace cho client production

## 9.1. Backend không được tin client

Không tin:

```text
adminId
workerId
role
score
metrics
kerf
stockLength
```

Ví dụ đúng:

```ts
// Admin id phải lấy từ JWT/session, không lấy từ body để tránh client giả mạo.
const adminId = req.user!.mand;
```

Ví dụ sai:

```ts
const adminId = req.body.adminId;
```

## 9.2. Error handling

Không được:

```ts
try {
  ...
} catch (e) {
  console.log(e);
}
```

Phải xử lý rõ:

```ts
try {
  ...
} catch (error) {
  logger.error(error);
  throw new AppError("Không thể xử lý yêu cầu", 500);
}
```

## 9.3. HTTP status

Dùng status hợp lý:

```text
200: thành công
201: tạo mới
400: input sai
401: chưa xác thực
403: không có quyền
404: không tìm thấy
409: conflict/stale/expired
500: lỗi hệ thống
```

---

# 10. Luật Cutting Plan / Tối ưu cắt vật tư

Đây là module trọng tâm và nhạy cảm.

## 10.1. Admin tạo sơ đồ cắt

Admin dùng hệ thống để tạo sơ đồ cắt lý thuyết dựa trên:

* BOM cần cắt
* Kho phôi
* Chiều dài phôi
* Vật tư
* Trạng thái phôi
* Kerf
* Safe margin
* Heuristic tối ưu

Admin là người quản lý phương án chính thức.

## 10.2. Tạo sơ đồ không được trừ kho

Không được trừ kho khi chỉ tạo sơ đồ.

Kho chỉ được cập nhật khi flow hoàn thành cắt, ví dụ:

```text
completePlan
```

Nếu Agent thấy code trừ kho ngay khi tạo sơ đồ, phải đánh dấu P0/P1 tùy mức độ và báo ngay.

## 10.3. Không tạo lại sơ đồ hoàn thành tùy tiện

Nếu sơ đồ đã:

```text
DANG_CAT
HOAN_THANH
```

thì không được ghi đè trực tiếp mà không có rule nghiệp vụ rõ.

Lý do:

* Worker có thể đã cắt thật.
* Kho có thể đã thay đổi.
* Nhật ký sản xuất có thể đã ghi.
* Ghi đè có thể làm sai dữ liệu.

## 10.4. Trang `/admin/toi-uu-cat`

Trang này nên tách:

```text
/admin/toi-uu-cat
/admin/toi-uu-cat/[mapc]
```

Không nên render toàn bộ list phân công và toàn bộ detail sơ đồ trên cùng một màn hình nếu dữ liệu có thể lớn.

Nếu task liên quan trang này, Agent phải kiểm tra:

* Search
* Filter
* Sort
* Page size
* Loading
* Empty
* Error
* Detail đúng mapc
* Không render quá nặng
* Không tạo lại sơ đồ sai trạng thái

---

# 11. Luật Worker Proposal

Worker Proposal là flow nhạy cảm vì liên quan thực tế xưởng.

## 11.1. Worker không được sửa sơ đồ chính thức

Worker chỉ được:

* Xem sơ đồ đang giao
* Nhập/chỉnh phương án đề xuất
* Gửi Admin duyệt

Worker không được:

* Ghi đè `sodocat`
* Ghi đè `chitietcat`
* Sửa sơ đồ chính thức
* Approve proposal
* Reject proposal
* Trừ kho

## 11.2. Worker Proposal không phải auto simulate

Agent phải tránh thiết kế Worker Proposal thành:

```text
Worker bấm nút → hệ thống tự tìm phương án tối ưu hơn → gửi Admin
```

Lý do:

* Admin ban đầu cũng dùng hệ thống tạo sơ đồ.
* Nếu hệ thống tự tìm tốt hơn thì Admin đáng lẽ đã có phương án đó.
* Worker Proposal phải phản ánh tình huống thực tế ngoài xưởng.

Thiết kế đúng:

```text
Worker xem sơ đồ đang giao
→ Worker thấy thực tế khác dữ liệu hệ thống
→ Worker nhập/chỉnh phương án cắt thực tế
→ Hệ thống validate/tính metrics
→ Gửi Admin duyệt
```

## 11.3. FE không gửi metrics

FE không được gửi:

```text
score
metrics
kerf
utilization
waste
```

Backend tự tính lại.

## 11.4. Backend submit proposal phải validate

Backend phải kiểm tra:

* Worker đúng phân công
* `mapc` tồn tại
* `mactdh` thuộc đúng đơn hàng/phân công
* `maphoi` tồn tại
* `maphoi.mavt` khớp vật tư cần cắt
* Phôi không `BO_DI`
* Phôi không có sự cố mở
* Tổng chiều dài không vượt chiều dài dùng được
* Không thiếu/dư BOM
* Backend tự tính kerf/safe margin/metrics

---

# 12. Luật Admin Proposal

Admin Proposal liên quan duyệt thay đổi sơ đồ chính thức.

## 12.1. Admin duyệt/từ chối

Admin được:

* Xem proposal
* Duyệt proposal
* Từ chối proposal

Admin approve/reject phải qua backend.

Không approve/reject trực tiếp từ frontend bằng cách sửa bảng.

## 12.2. Approve phải qua RPC

Approve proposal phải gọi RPC:

```text
approve_cutting_proposal
```

Không được hard replace:

```text
sodocat
chitietcat
```

bằng TypeScript service thường nếu RPC đã được thiết kế làm transaction.

## 12.3. Reject phải qua RPC

Reject proposal phải gọi RPC:

```text
reject_cutting_proposal
```

Reject không được sửa sơ đồ chính thức.

Reject không được sửa kho.

## 12.4. FE không gửi adminId

FE approve/reject chỉ gửi:

```json
{
  "ghichu": "..."
}
```

Không gửi:

```text
adminId
admin_ghichu nếu backend không đọc field này
score
metrics
kerf
```

Admin id phải lấy từ JWT/session ở backend.

## 12.5. Stale/Expired proposal

Nếu proposal đã stale/expired, không được approve.

Các trường hợp stale có thể gồm:

* Sơ đồ đã bắt đầu cắt
* Sơ đồ đã hoàn thành
* Nhát cắt đã có nhật ký
* Có sự cố mở
* Dữ liệu kho/phôi không còn hợp lệ
* Proposal không còn trạng thái `CHO_DUYET`

Khi stale, backend nên trả:

```text
409 EXPIRED
```

UI phải báo rõ, không crash.

---

# 13. Luật completePlan / trừ kho

`completePlan` hoặc flow hoàn thành cắt là vùng cực kỳ nhạy cảm.

Agent không được tự ý sửa:

```text
completePlan
flow trừ kho
nhật ký gia công
cập nhật khothanhphoi
```

nếu task không yêu cầu trực tiếp.

Nếu task yêu cầu sửa completePlan, Agent phải:

1. Phân tích kỹ nghiệp vụ.
2. Đọc toàn bộ flow liên quan.
3. Kiểm tra bảng bị ảnh hưởng.
4. Kiểm tra transaction.
5. Kiểm tra rollback/consistency.
6. Tạo runtime checklist riêng.
7. Chờ duyệt nếu có migration/RPC.

Không được sửa completePlan chỉ vì muốn fix UI.

---

# 14. Luật Upload ảnh / Storage

Nếu task liên quan upload ảnh, Agent phải kiểm tra:

* Frontend dùng đúng API base URL.
* Mobile không gọi `localhost`.
* Backend CORS đúng.
* File size được validate.
* MIME type được validate.
* Bucket Supabase đúng.
* Storage path không xung đột.
* Không expose service role ra FE.
* Upload lỗi có message rõ.
* Admin xem ảnh được nếu flow yêu cầu.

Không được hardcode URL local:

```text
localhost
127.0.0.1
192.168.x.x
```

vào production code.

---

# 15. Luật Deploy / Production

Agent không được tự deploy production nếu chưa được yêu cầu.

Nếu task deploy, Agent phải kiểm tra:

## 15.1. Frontend

* Root directory đúng: `FE`
* Build command đúng: `npm run build`
* Env production không dùng localhost
* `NEXT_PUBLIC_API_URL` đúng backend production
* Supabase public env đúng

## 15.2. Backend

* Root directory đúng: `BE`
* Build command đúng
* Start command đúng
* Port dùng `process.env.PORT`
* CORS_ORIGIN đúng frontend production
* Service role key chỉ ở backend
* Logs không lộ secret

## 15.3. Sau deploy

Phải test:

* Login Admin
* Login Worker
* API không CORS
* Network không gọi localhost
* Route chính chạy
* Backend logs không lỗi nghiêm trọng

---

# 16. Luật Test Data

Agent không được bịa dữ liệu test là dữ liệu thật.

Nếu cần test runtime, Agent phải yêu cầu:

* Tài khoản Admin thật/dev
* Tài khoản Worker thật/dev
* `mapc` thật
* `madxc` thật nếu cần
* `maphoi` thật nếu cần
* `mactdh` thật nếu cần

Nếu chưa có dữ liệu test, Agent phải ghi:

```text
Chưa runtime test được vì chưa có tài khoản/dữ liệu test thật.
```

Không được tự kết luận runtime pass.

---

# 17. Luật Comment an toàn

Code liên quan nghiệp vụ nhạy cảm phải có comment giải thích lý do.

Bắt buộc comment ở:

* Check role
* Check data scope
* Không trừ kho khi tạo sơ đồ
* Không cho Worker sửa sơ đồ chính thức
* FE không gửi adminId
* Backend tự tính metrics
* Proposal stale/expired
* Transaction/RPC approve
* Validate phôi `BO_DI`
* Validate vật tư khớp BOM
* Cleanup nếu insert nhiều bảng lỗi

Comment phải giải thích “vì sao”, không chỉ “làm gì”.

Ví dụ tốt:

```ts
// Không cập nhật kho khi tạo sơ đồ/proposal.
// Kho chỉ được cập nhật khi Worker hoàn thành cắt qua completePlan.
```

---

# 18. Luật phân loại lỗi

Agent phải phân loại lỗi theo P0/P1/P2.

## 18.1. P0 - Phải sửa trước khi bàn giao

* Build fail
* App crash
* Route thiếu auth/role
* Worker xem/sửa dữ liệu người khác
* Worker sửa sơ đồ chính thức
* FE gửi field cấm và backend tin field đó
* Backend dùng adminId từ body
* Approve không qua RPC
* Trừ kho sai thời điểm
* Migration nguy hiểm
* Xóa dữ liệu thật
* Service role lộ ra frontend
* Production gọi localhost

## 18.2. P1 - Nên sửa sớm

* UI khó dùng
* Wording gây hiểu nhầm
* Thiếu pagination khi dữ liệu lớn
* Error handling kém
* Alert trình duyệt thay vì toast/modal
* Script dev mutate DB thiếu guard
* Insert nhiều bảng không transaction
* Runtime flow chưa test thật
* API contract dễ lệch

## 18.3. P2 - Có thể để sau

* Polish responsive
* Refactor component
* Tối ưu layout nhỏ
* Animation
* Dashboard nâng cao
* Tối ưu hiệu năng phụ

---

# 19. Luật khi yêu cầu mâu thuẫn với Safety Rules

Nếu người dùng yêu cầu điều nguy hiểm, Agent phải dừng.

Format phản hồi:

```text
Yêu cầu này có rủi ro:
- ...

Không nên làm trực tiếp vì:
- ...

Phương án an toàn hơn:
- ...

Cần bạn xác nhận nếu vẫn muốn tiếp tục.
```

Ví dụ:

```text
Yêu cầu: Xóa hết proposal cũ cho sạch.

Phản hồi đúng:
Không nên xóa trực tiếp dữ liệu proposal thật. Phương án an toàn hơn là lọc trạng thái, archive mềm, hoặc chạy script trên DB dev trước.
```

---

# 20. Luật khi không chắc

Nếu Agent không chắc:

* API hiện tại trả gì
* DB schema hiện tại thế nào
* Role route đang setup ra sao
* Flow nghiệp vụ có đúng không
* Dữ liệu test có tồn tại không

thì phải nói rõ:

```text
Chưa đủ thông tin để kết luận.
Cần đọc file X / kiểm API Y / tester cung cấp dữ liệu Z.
```

Không được đoán chắc chắn.

---

# 21. Luật kết luận

Agent không được nói:

```text
Pass 100%.
Không còn lỗi.
Bàn giao chắc chắn.
Đã hoàn thành cuối cùng.
```

Agent chỉ được nói:

```text
Self-review không phát hiện P0.
Lint/build pass.
Sẵn sàng đưa reviewer/tester kiểm tra runtime.
Pass cuối cần tester xác nhận.
```

Nếu chưa runtime test:

```text
Chưa runtime test bằng tài khoản thật.
Cần tester kiểm tra theo checklist.
```

---

# 22. Output bắt buộc khi áp dụng Safety Rules

Khi task đụng vùng rủi ro cao, Agent phải báo:

```text
## Safety Review

Vùng rủi ro liên quan:
- ...

Có đụng DB/migration không:
- ...

Có đụng auth/RBAC không:
- ...

Có đụng cutting/proposal/completePlan không:
- ...

Field nhạy cảm từ FE:
- ...

Rủi ro P0/P1/P2:
- ...

Quyết định:
- Có thể làm trong phạm vi an toàn / Cần hỏi lại / Không nên làm trực tiếp
```

---

# 23. Tiêu chuẩn hoàn thành Skill 07

Skill này được xem là làm đúng khi Agent:

* Không chạy lệnh nguy hiểm.
* Không sửa DB/migration/RPC khi chưa được duyệt.
* Không expose secret.
* Không tin client.
* Không phá RBAC.
* Không để Worker vượt quyền.
* Không phá flow cutting/proposal.
* Không trừ kho sai thời điểm.
* Không sửa completePlan ngoài phạm vi.
* Phân loại rủi ro P0/P1/P2.
* Dừng lại khi yêu cầu nguy hiểm.
* Đề xuất phương án an toàn hơn.

Skill này làm sai nếu Agent:

* Chạy migration chưa được duyệt.
* Xóa dữ liệu thật.
* Sửa lan module nhạy cảm.
* Để Worker approve proposal.
* Cho FE gửi adminId/metrics rồi backend tin.
* Approve proposal không qua RPC.
* Trừ kho khi chỉ tạo sơ đồ.
* Lộ service role key.
* Tự nói pass cuối khi chưa tester duyệt.

```
```
