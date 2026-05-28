# 05 Runtime Test Checklist

````markdown
# Skill 05: Runtime Test Checklist

Skill này quy định cách Agent phải tạo checklist kiểm thử runtime sau khi code, lint/build và self-review.

Mục tiêu của skill này là đảm bảo chức năng được kiểm tra bằng trình duyệt, tài khoản thật, API thật và flow nghiệp vụ thật trước khi được coi là pass.

Runtime Test Checklist không thay thế lint/build.  
Lint/build kiểm tra code compile được.  
Runtime test kiểm tra chức năng có chạy đúng ngoài thực tế hay không.

Agent không được tự quyết định pass cuối.  
Agent chỉ được tạo checklist và hướng dẫn tester kiểm tra.

---

# 1. Vai trò của skill

Sau khi implement và self-review, Agent phải tạo checklist runtime rõ ràng cho reviewer/tester.

Checklist phải giúp tester biết:

- Cần login bằng role nào.
- Cần vào route nào.
- Cần bấm gì.
- Cần nhập dữ liệu gì.
- Cần kiểm tra API request/response gì.
- Cần kiểm tra UI hiển thị gì.
- Cần kiểm tra DB/trạng thái gì nếu cần.
- Cần kiểm tra lỗi Console/Network gì.
- Khi nào được xem là pass.
- Khi nào phải trả về cho Agent sửa.

Agent không được chỉ nói chung chung:

```text
Test lại chức năng.
````

Mà phải viết thành từng bước cụ thể.

---

# 2. Khi nào phải dùng skill này?

Phải dùng sau mọi task có thể ảnh hưởng runtime.

Bao gồm:

* Tạo page mới
* Sửa page cũ
* Sửa component
* Sửa API client
* Sửa backend route
* Sửa backend service
* Sửa auth/RBAC
* Sửa proposal flow
* Sửa cutting plan flow
* Sửa upload ảnh
* Sửa dashboard
* Sửa filter/search/pagination
* Sửa form
* Sửa modal
* Sửa wording có ảnh hưởng nghiệp vụ
* Sửa deploy/config/env

Nếu task chỉ là tài liệu thuần túy, không cần runtime test nhưng phải ghi rõ:

```text
Task này chỉ sửa tài liệu, không có runtime checklist.
```

---

# 3. Nguyên tắc viết runtime checklist

Checklist phải rõ ràng, có thể làm theo từng bước.

Mỗi checklist nên có:

1. Điều kiện chuẩn bị.
2. Tài khoản/role cần dùng.
3. Route cần vào.
4. Các bước thao tác.
5. Kết quả mong đợi.
6. Điểm cần kiểm tra trong DevTools.
7. Điều kiện pass/fail.
8. Ghi chú rủi ro nếu có.

Không viết checklist quá mơ hồ.

Sai:

```text
Test trang tối ưu cắt.
```

Đúng:

```text
1. Login Admin.
2. Vào `/admin/toi-uu-cat`.
3. Kiểm tra danh sách phân công hiển thị.
4. Search theo `PC-8`.
5. Bấm “Xem chi tiết”.
6. Kiểm tra URL chuyển sang `/admin/toi-uu-cat/8`.
7. Kiểm tra thông tin PC-8, DH-15, sơ đồ đã lưu.
```

---

# 4. Checklist chung cho mọi task Frontend

Nếu task sửa frontend, Agent phải tạo checklist gồm các mục sau.

## 4.1. Kiểm tra page render

Tester cần kiểm tra:

* Page mở được.
* Không trắng màn hình.
* Không crash.
* Layout không vỡ nghiêm trọng.
* Sidebar/header vẫn hoạt động.
* Route đúng.

## 4.2. Kiểm tra loading state

Tester cần kiểm tra:

* Khi tải dữ liệu có loading.
* Loading biến mất sau khi API trả về.
* Không bị loading mãi.

## 4.3. Kiểm tra empty state

Tester cần kiểm tra:

* Khi không có dữ liệu, UI hiện thông báo rõ.
* Không hiện bảng/card trống khó hiểu.
* Không hiện lỗi kỹ thuật cho user.

## 4.4. Kiểm tra error state

Tester cần kiểm tra:

* Khi API lỗi, UI báo lỗi dễ hiểu.
* Có thể retry hoặc quay lại nếu phù hợp.
* Không để trang trắng.

## 4.5. Kiểm tra fallback dữ liệu

Tester cần kiểm tra UI không hiện:

```text
undefined
null
NaN
NaN%
undefined mm
```

Nếu thiếu dữ liệu, UI nên hiện:

```text
—
```

hoặc thông báo rõ:

```text
Chưa có đủ dữ liệu để hiển thị.
```

## 4.6. Kiểm tra format số

Tester cần kiểm tra:

* `%` không quá dài.
* `mm` có khoảng trắng.
* Số tiền nếu có được format dễ đọc.
* Ngày giờ nếu có dễ đọc.

Đúng:

```text
27.21%
60 mm
1.500.000 đ
```

Sai:

```text
27.207657689834992%
60mm
NaN%
```

## 4.7. Kiểm tra Console

Mở DevTools → Console.

Không được có:

* Error đỏ nghiêm trọng.
* Hydration error.
* React key warning lặp lại.
* Unhandled promise rejection.
* TypeError runtime.

Nếu có warning nhỏ không ảnh hưởng, ghi lại để phân loại P1/P2.

## 4.8. Kiểm tra Network

Mở DevTools → Network.

Kiểm tra:

* API gọi đúng endpoint.
* Method đúng.
* Request body đúng.
* Status code đúng.
* Không bị 401/403 ngoài dự kiến.
* Không bị 500.
* Không gọi API lặp vô hạn.
* Không gửi field cấm.

---

# 5. Checklist chung cho mọi task Backend/API

Nếu task sửa backend hoặc API client, Agent phải tạo checklist gồm các mục sau.

## 5.1. Kiểm tra auth

Tester cần kiểm tra:

* Chưa login thì bị chặn.
* Token hết hạn thì bị chặn.
* Login đúng role thì dùng được.

## 5.2. Kiểm tra RBAC

Tester cần kiểm tra:

* Admin vào được route Admin.
* Worker không vào được route Admin.
* Worker vào được route Worker của mình.
* Worker không xem/sửa dữ liệu worker khác.

## 5.3. Kiểm tra request body

Tester cần kiểm tra request body không có field cấm:

```text
adminId
workerId
role
score
metrics
kerf
service_role_key
```

## 5.4. Kiểm tra response

Tester cần kiểm tra:

* Response trả đúng shape FE cần.
* Error message dễ hiểu.
* Status code đúng.

Gợi ý status:

```text
200: thành công
201: tạo mới thành công
400: input sai
401: chưa đăng nhập
403: không có quyền
404: không tìm thấy
409: xung đột trạng thái/stale/expired
500: lỗi hệ thống
```

## 5.5. Kiểm tra validation

Tester cần thử:

* Thiếu field required.
* Field sai type.
* ID không tồn tại.
* Dữ liệu không thuộc quyền user.
* Trạng thái không hợp lệ.

Backend phải chặn đúng.

---

# 6. Checklist cho Admin Tối ưu cắt vật tư

Dùng checklist này khi task liên quan trang:

```text
/admin/toi-uu-cat
/admin/toi-uu-cat/[mapc]
```

## 6.1. Điều kiện chuẩn bị

Cần có:

* Tài khoản Admin.
* Ít nhất một phân công có dữ liệu.
* Nếu có thể, chọn một `mapc` thật, ví dụ `mapc=8`.
* Backend đang chạy.
* Frontend đang chạy.
* Supabase env đúng.

## 6.2. Test trang danh sách `/admin/toi-uu-cat`

Các bước:

1. Login bằng tài khoản Admin.
2. Vào route:

```text
/admin/toi-uu-cat
```

1. Kiểm tra tiêu đề trang hiển thị đúng.
2. Kiểm tra danh sách phân công hiển thị.
3. Kiểm tra mỗi item có thông tin nhận diện cơ bản:

   * Mã phân công
   * Mã đơn hàng nếu có
   * Khách hàng nếu có
   * Worker nếu có
   * Trạng thái nếu có
   * Số sơ đồ nếu có
   * Nút “Xem chi tiết”
4. Kiểm tra page không còn render toàn bộ chi tiết sơ đồ cắt trên màn hình list.
5. Kiểm tra search theo mã phân công.
6. Kiểm tra search theo mã đơn hàng.
7. Kiểm tra search theo khách hàng nếu API có dữ liệu.
8. Kiểm tra search theo worker nếu API có dữ liệu.
9. Kiểm tra filter trạng thái.
10. Kiểm tra sort.
11. Kiểm tra page size.
12. Bấm “Xem chi tiết” trên một phân công.
13. Kiểm tra URL chuyển đúng sang:

```text
/admin/toi-uu-cat/[mapc]
```

Kết quả mong đợi:

* Trang list gọn.
* Không còn quá dài vì render tất cả detail.
* Search/filter/sort không crash.
* Không hiện `undefined`, `null`, `NaN`.
* Không có lỗi đỏ Console.
* Không có API fail ngoài dự kiến.

## 6.3. Test trang chi tiết `/admin/toi-uu-cat/[mapc]`

Các bước:

1. Từ list bấm “Xem chi tiết”.
2. Hoặc vào trực tiếp:

```text
/admin/toi-uu-cat/8
```

1. Kiểm tra header hiển thị đúng mã phân công.
2. Kiểm tra mã đơn hàng đúng.
3. Kiểm tra khách hàng/worker nếu có.
4. Kiểm tra nút “Quay lại danh sách”.
5. Kiểm tra section “Thông tin phân công”.
6. Kiểm tra section “BOM cần cắt”.
7. Nếu API chưa có BOM, UI phải báo rõ:

```text
Chưa có đủ dữ liệu BOM từ API hiện tại.
```

1. Kiểm tra section “Tiêu chí tối ưu”.
2. Kiểm tra mô tả heuristic mặc định.
3. Kiểm tra section “Sơ đồ đã lưu”.
4. Kiểm tra mỗi sơ đồ có:

    * Mã sơ đồ
    * UID phôi
    * Vật tư
    * Chiều dài gốc
    * Đã dùng
    * Phần dư
    * Số nhát cắt
    * Tỷ lệ dùng
    * Trạng thái
5. Kiểm tra chi tiết nhát cắt nếu có.
6. Kiểm tra accordion/collapse không bung quá nhiều mặc định nếu dữ liệu lớn.
7. Kiểm tra nút “Tạo sơ đồ cắt”.
8. Nếu bấm tạo sơ đồ, kiểm tra API gọi đúng như trước.
9. Kiểm tra tạo sơ đồ không làm crash UI.
10. Kiểm tra không trừ kho ngay khi chỉ tạo sơ đồ.
11. Kiểm tra Console/Network.

Kết quả mong đợi:

* Trang detail đúng `mapc`.
* Không hiển thị nhầm dữ liệu phân công khác.
* Không crash khi dữ liệu thiếu.
* Tạo sơ đồ vẫn giữ logic cũ.
* Không đổi API contract ngoài dự kiến.

## 6.4. Test route invalid

Các bước:

1. Vào route không hợp lệ:

```text
/admin/toi-uu-cat/abc
/admin/toi-uu-cat/-1
/admin/toi-uu-cat/999999
```

1. Kiểm tra UI xử lý hợp lý.

Kết quả mong đợi:

* Không crash.
* Hiển thị thông báo không tìm thấy hoặc dữ liệu không hợp lệ.
* Có nút quay lại danh sách.

---

# 7. Checklist cho Worker Proposal

Dùng checklist này khi task liên quan:

```text
/worker/cat
ProposalSubmitModal
WorkerProposalsList
worker cutting proposals API
```

## 7.1. Điều kiện chuẩn bị

Cần có:

* Tài khoản Worker.
* Worker có ít nhất một phân công thật.
* Có `mapc` thuộc worker đó.
* Có sơ đồ cắt đang giao nếu test sao chép.
* Có dữ liệu phôi/BOM hợp lệ để tạo proposal.
* Backend đang chạy.
* Frontend đang chạy.

## 7.2. Test Worker xem sơ đồ được giao

Các bước:

1. Login bằng tài khoản Worker.
2. Vào:

```text
/worker/cat?mapc=...
```

1. Kiểm tra Worker chỉ thấy phân công của mình.
2. Kiểm tra sơ đồ cắt đang giao hiển thị.
3. Kiểm tra thông tin phôi/nhát cắt dễ hiểu.
4. Kiểm tra không có nút sửa sơ đồ chính thức.
5. Kiểm tra không có nút approve/reject.

Kết quả mong đợi:

* Worker chỉ xem được dữ liệu thuộc mình.
* Worker không có quyền sửa sơ đồ chính thức.

## 7.3. Test tạo proposal

Các bước:

1. Mở tab hoặc section “Đề xuất phương án”.
2. Bấm tạo đề xuất điều chỉnh.
3. Kiểm tra modal mở đúng.
4. Kiểm tra modal có phần:

   * Sơ đồ cắt đang giao từ Admin
   * Phương án Worker đề xuất
   * Lý do đề xuất
5. Nếu có nút sao chép sơ đồ đang giao, bấm sao chép.
6. Kiểm tra dữ liệu được copy sang phần đề xuất.
7. Thêm phôi đề xuất nếu cần.
8. Thêm nhát cắt.
9. Nhập:

   * `maphoi`
   * `mactdh`
   * `chieudaicat`
   * `thutucat`
10. Nhập lý do thực tế.
11. Bấm gửi Admin duyệt.

Kết quả mong đợi:

* Proposal được gửi thành công nếu dữ liệu hợp lệ.
* UI báo thành công.
* Proposal xuất hiện trong danh sách proposal của Worker.
* Worker không sửa sơ đồ chính thức.

## 7.4. Kiểm tra request payload Worker Proposal

Trong DevTools → Network, kiểm tra request tạo proposal.

Payload được phép có:

```text
mapc
lydodexuat
maphoi
mactdh
chieudaicat
thutucat
```

Payload không được có:

```text
adminId
score
metrics
kerf
utilization
waste
role
service_role_key
```

Kết quả mong đợi:

* Backend tự tính metrics.
* FE không gửi field nhạy cảm.
* FE không giả lập quyền.

## 7.5. Test validation lỗi

Tester cần thử:

1. Bỏ trống lý do.
2. Nhập `maphoi` không tồn tại.
3. Nhập `mactdh` không hợp lệ.
4. Nhập chiều dài cắt vượt phôi.
5. Nhập thiếu nhát cắt.
6. Dùng phôi `BO_DI` nếu có dữ liệu test.
7. Dùng phôi sai vật tư nếu có dữ liệu test.

Kết quả mong đợi:

* Backend chặn lỗi.
* UI hiển thị lỗi dễ hiểu.
* Không tạo proposal rác.
* Không sửa sơ đồ chính thức.
* Không trừ kho.

---

# 8. Checklist cho Admin Proposal

Dùng checklist này khi task liên quan:

```text
/admin/de-xuat-cat
admin cutting proposals API
approve/reject proposal
```

## 8.1. Điều kiện chuẩn bị

Cần có:

* Tài khoản Admin.
* Có proposal `CHO_DUYET`.
* Có proposal đã stale/expired nếu muốn test 409.
* Backend đang chạy.
* Frontend đang chạy.

## 8.2. Test danh sách proposal

Các bước:

1. Login bằng Admin.
2. Vào:

```text
/admin/de-xuat-cat
```

1. Kiểm tra danh sách proposal hiển thị.
2. Kiểm tra proposal có:

   * Mã đề xuất
   * Mã phân công
   * Worker
   * Lý do
   * Trạng thái
   * Ngày tạo
3. Mở chi tiết proposal.

Kết quả mong đợi:

* Admin thấy danh sách proposal.
* Không crash khi danh sách rỗng.
* Không hiện `undefined/null/NaN`.

## 8.3. Test detail proposal

Các bước:

1. Chọn một proposal.
2. Mở detail.
3. Kiểm tra thông tin header.
4. Kiểm tra chi tiết phôi/nhát cắt Worker đề xuất.
5. Kiểm tra metrics nếu backend trả.
6. Kiểm tra lý do đề xuất.
7. Kiểm tra action approve/reject chỉ enable khi trạng thái là:

```text
CHO_DUYET
```

Kết quả mong đợi:

* Proposal đã duyệt/từ chối/hết hiệu lực không thao tác lại được.
* UI giải thích trạng thái rõ.

## 8.4. Test reject proposal

Các bước:

1. Chọn proposal `CHO_DUYET`.
2. Bấm từ chối.
3. Nhập ghi chú.
4. Submit.
5. Kiểm tra Network request.

Request body phải là:

```json
{
  "ghichu": "..."
}
```

Không được gửi:

```text
adminId
admin_ghichu nếu backend không đọc field này
score
metrics
kerf
```

Kết quả mong đợi:

* Proposal chuyển sang `TU_CHOI`.
* Sơ đồ chính thức không đổi.
* Kho không đổi.
* Ghi chú hiển thị đúng nếu UI có hiển thị.

## 8.5. Test approve proposal

Các bước:

1. Chọn proposal `CHO_DUYET`.
2. Bấm duyệt.
3. Nhập ghi chú nếu có.
4. Submit.
5. Kiểm tra Network request.

Request body phải là:

```json
{
  "ghichu": "..."
}
```

Không được gửi:

```text
adminId
score
metrics
kerf
```

Kết quả mong đợi nếu proposal hợp lệ:

* API trả thành công.
* Proposal chuyển `DA_DUYET`.
* Sơ đồ chính thức được thay qua backend/RPC.
* Proposal khác cùng `mapc` nếu còn `CHO_DUYET` chuyển `HET_HIEU_LUC` nếu backend có logic này.
* Kho chưa bị trừ nếu chưa completePlan.

Kết quả mong đợi nếu proposal stale:

* API trả 409.
* UI báo rõ:

```text
Đề xuất đã hết hiệu lực do dữ liệu sản xuất đã thay đổi.
```

* UI không crash.
* Sơ đồ chính thức không bị thay sai.

---

# 9. Checklist cho Upload ảnh mobile

Dùng checklist này khi task liên quan upload ảnh, mobile, Supabase Storage.

## 9.1. Điều kiện chuẩn bị

Cần có:

* Laptop chạy FE/BE trong cùng mạng LAN.
* Điện thoại cùng Wi-Fi.
* API base URL dùng IP LAN, không phải localhost.
* Tài khoản phù hợp.
* Bucket Supabase Storage đúng.
* CORS backend đúng.

## 9.2. Test kết nối mobile

Các bước:

1. Trên điện thoại mở API health endpoint bằng IP LAN.
2. Kiểm tra có JSON response.
3. Mở frontend bằng IP LAN.
4. Login.
5. Kiểm tra API call không bị CORS.

Kết quả mong đợi:

* Điện thoại gọi được backend.
* Không dùng `localhost` trên mobile.
* Không CORS error.

## 9.3. Test upload ảnh

Các bước:

1. Vào màn hình có upload ảnh.
2. Chọn ảnh từ camera/gallery.
3. Upload.
4. Kiểm tra loading.
5. Kiểm tra upload thành công.
6. Kiểm tra ảnh xem được sau upload.
7. Kiểm tra Admin xem được ảnh nếu flow yêu cầu.

Kết quả mong đợi:

* Ảnh lên Supabase Storage.
* DB lưu URL/path đúng.
* Không lỗi dung lượng.
* Không lỗi MIME type.
* Không lỗi quyền bucket.
* Không mất token.

---

# 10. Checklist cho Kho phôi

Dùng checklist này khi task liên quan:

```text
/admin/kho-phoi
stock inventory
khothanhphoi
```

## 10.1. Test danh sách kho phôi

Các bước:

1. Login Admin.
2. Vào:

```text
/admin/kho-phoi
```

1. Kiểm tra danh sách phôi hiển thị.
2. Kiểm tra filter trạng thái.
3. Kiểm tra filter vật tư.
4. Kiểm tra search UID.
5. Kiểm tra sort chiều dài.
6. Kiểm tra không hiện layout lệch.

Kết quả mong đợi:

* Filter không vỡ UI.
* Không hiện `undefined/null/NaN`.
* Số mm format đúng.
* Trạng thái rõ.

## 10.2. Test filter nâng cao nếu có

Các bước:

1. Mở bộ lọc nâng cao.
2. Lọc theo chiều dài dùng được.
3. Lọc theo phôi dư.
4. Lọc theo `BO_DI`.
5. Reset filter.

Kết quả mong đợi:

* Filter đúng dữ liệu.
* Reset hoạt động.
* Không mất dữ liệu ngoài ý muốn.

---

# 11. Checklist cho Dashboard/DSS

Dùng checklist này khi task liên quan dashboard hỗ trợ ra quyết định.

## 11.1. Điều kiện

Dashboard phải dùng dữ liệu thật.

Không fake data.

Nguồn có thể gồm:

```text
sodocat
chitietcat
khothanhphoi
dexuatcat
chitietdexuatcat
nhatkygiacong
chitietdh
```

## 11.2. Test dashboard

Các bước:

1. Login Admin.
2. Vào dashboard/DSS.
3. Kiểm tra các chỉ số chính.
4. Đối chiếu một vài số với dữ liệu thật nếu có thể.
5. Kiểm tra loading/error/empty state.
6. Kiểm tra biểu đồ không crash khi dữ liệu rỗng.
7. Kiểm tra không fake số.

Kết quả mong đợi:

* Chỉ số có nguồn dữ liệu thật.
* Không có dữ liệu thì hiện empty state.
* Không hiện NaN/undefined.
* Không nói “tối ưu tuyệt đối”.

---

# 12. Checklist cho Deploy Production

Dùng checklist này khi task liên quan deploy Vercel/Render/Railway/Supabase.

## 12.1. Frontend deploy

Kiểm tra:

* Vercel Root Directory đúng:

```text
FE
```

* Build command đúng:

```text
npm run build
```

* Output Next.js đúng.
* Env không dùng localhost.
* `NEXT_PUBLIC_API_URL` trỏ backend production.
* Supabase anon/public env đúng.

## 12.2. Backend deploy

Kiểm tra:

* Root Directory đúng:

```text
BE
```

* Build command:

```text
npm install && npm run build
```

* Start command:

```text
npm start
```

hoặc:

```text
node dist/index.js
```

* Env Supabase URL/key đúng.
* Service role key chỉ ở backend.
* CORS_ORIGIN trỏ đúng frontend production.
* Port lấy từ `process.env.PORT`.

## 12.3. Test sau deploy

Các bước:

1. Mở frontend production.
2. Login Admin.
3. Login Worker.
4. Test route chính.
5. Test API call không CORS.
6. Test tạo/sửa nghiệp vụ quan trọng nếu môi trường cho phép.
7. Kiểm tra logs backend.
8. Kiểm tra Network không gọi localhost.

Kết quả mong đợi:

* Production chạy được.
* Không có env sai.
* Không lộ secret.
* Không gọi localhost.

---

# 13. Cách ghi kết quả runtime test

Agent phải yêu cầu tester ghi kết quả theo format:

```text
## Runtime Test Result

Role:
- Admin / Worker

Môi trường:
- Local / Dev / Production

Route:
- ...

Kết quả:
- Pass / Fail

Lỗi nếu có:
- Bước lỗi:
- Ảnh chụp:
- Console error:
- Network error:
- Expected:
- Actual:

Ghi chú:
- ...
```

Nếu tester báo lỗi, Agent phải dùng thông tin đó để sửa đúng lỗi, không đoán bừa.

---

# 14. Điều kiện pass runtime

Một task được xem là runtime pass khi:

* Page mở được.
* Không crash.
* Không lỗi đỏ nghiêm trọng trong Console.
* API chính không fail ngoài dự kiến.
* Role đúng quyền.
* Dữ liệu hiển thị đúng.
* Button/form hoạt động đúng.
* Error state hiển thị hợp lý.
* Flow nghiệp vụ chính đúng.
* Không có P0.
* Tester xác nhận pass.

---

# 15. Điều kiện fail runtime

Một task bị fail runtime nếu có một trong các lỗi:

* Màn hình trắng.
* App crash.
* Build production fail.
* API chính trả 500.
* API trả 401/403 sai.
* Worker xem/sửa dữ liệu người khác.
* Worker sửa sơ đồ chính thức.
* Admin approve/reject không chạy.
* FE gửi field cấm.
* Tạo sơ đồ làm trừ kho sai thời điểm.
* Proposal stale nhưng vẫn được approve.
* UI hiển thị dữ liệu sai nghiêm trọng.
* Network gọi localhost ở production/mobile.
* Console có lỗi đỏ làm hỏng chức năng.

---

# 16. Phân loại lỗi runtime

## P0 - Phải sửa ngay

* App crash.
* Route quan trọng không vào được.
* Auth/RBAC sai.
* Dữ liệu người khác bị lộ.
* Worker có quyền quá mức.
* Backend 500 ở flow chính.
* Trừ kho sai.
* Approve proposal sai flow.
* FE gửi field cấm và backend tin field đó.
* Production gọi localhost.

## P1 - Nên sửa sớm

* UI khó dùng.
* Error message khó hiểu.
* Search/filter sai nhẹ.
* Wording gây hiểu nhầm.
* Alert trình duyệt chưa đẹp.
* Chưa có pagination khi dữ liệu lớn.
* Runtime chưa test đủ role.
* Một số fallback thiếu nhưng không crash.

## P2 - Có thể để sau

* Responsive chưa đẹp.
* Màu sắc/chữ nhỏ chưa tối ưu.
* Cần polish layout.
* Cần refactor component.
* Cần thêm animation.
* Cần tối ưu chart.

---

# 17. Output bắt buộc của Skill 05

Sau khi tạo runtime checklist, Agent phải xuất theo format:

```text
## 1. Phạm vi runtime test
- Module:
- Route:
- Role cần test:

## 2. Điều kiện chuẩn bị
- Tài khoản:
- Dữ liệu cần có:
- Môi trường:

## 3. Checklist test chính
1. ...
2. ...
3. ...

## 4. Checklist DevTools
- Console:
- Network:
- Request body:
- Response:

## 5. Checklist nghiệp vụ
- ...

## 6. Kết quả mong đợi
- ...

## 7. Điều kiện fail
- ...

## 8. Ghi chú cho tester
- ...

## 9. Kết luận
- Cần tester xác nhận pass cuối.
```

---

# 18. Ví dụ output đúng cho task tách trang tối ưu cắt

```text
## 1. Phạm vi runtime test
- Module: Admin Tối ưu cắt vật tư
- Route:
  - /admin/toi-uu-cat
  - /admin/toi-uu-cat/[mapc]
- Role cần test:
  - ADMIN

## 2. Điều kiện chuẩn bị
- Login Admin.
- Có ít nhất một phân công thật.
- Có một mapc test, ví dụ mapc=8.
- FE/BE đang chạy local hoặc dev.

## 3. Checklist test chính
1. Vào /admin/toi-uu-cat.
2. Kiểm tra danh sách phân công hiển thị.
3. Search theo mã phân công.
4. Filter trạng thái.
5. Đổi page size.
6. Bấm Xem chi tiết.
7. Kiểm tra URL sang /admin/toi-uu-cat/8.
8. Kiểm tra thông tin PC/DH đúng.
9. Kiểm tra sơ đồ đã lưu.
10. Bấm quay lại danh sách.
11. Nếu dữ liệu phù hợp, bấm tạo sơ đồ cắt.
12. Kiểm tra sơ đồ mới hiển thị hoặc API báo lỗi rõ.

## 4. Checklist DevTools
- Console không có lỗi đỏ.
- Network không có 500.
- API không gọi lặp vô hạn.
- Không hiện undefined/null/NaN.

## 5. Checklist nghiệp vụ
- Trang list không render toàn bộ detail.
- Trang detail chỉ hiển thị đúng một mapc.
- Tạo sơ đồ không trừ kho.
- Không đổi flow Worker Proposal.

## 6. Kết quả mong đợi
- UI gọn hơn.
- List/detail tách rõ.
- Logic tạo sơ đồ vẫn chạy như trước.

## 7. Điều kiện fail
- Trang trắng.
- Detail sai mapc.
- Bấm tạo sơ đồ lỗi 500.
- UI hiển thị dữ liệu phân công cũ.
- Console có TypeError.

## 8. Ghi chú cho tester
- Lint/build pass chưa đủ, cần test runtime bằng tài khoản Admin thật.

## 9. Kết luận
- Cần tester xác nhận pass cuối.
```

---

# 19. Tiêu chuẩn hoàn thành Skill 05

Skill này được xem là làm đúng khi Agent:

* Tạo checklist cụ thể theo module.
* Ghi rõ role cần test.
* Ghi rõ route cần vào.
* Ghi rõ dữ liệu cần chuẩn bị.
* Có checklist DevTools.
* Có checklist nghiệp vụ.
* Có kết quả mong đợi.
* Có điều kiện fail.
* Không tự pass cuối.

Skill này làm sai nếu Agent:

* Chỉ nói “test lại”.
* Không ghi role.
* Không ghi route.
* Không ghi bước cụ thể.
* Không kiểm Console/Network.
* Không kiểm nghiệp vụ.
* Không nêu điều kiện pass/fail.
* Tự kết luận pass khi chưa có tester duyệt.

```
```
