Theo phụ lục trường, hình phải có tên/đánh số và đặt dưới hình; bảng đặt tên phía trên bảng, và nội dung phụ lục có thể dùng để minh họa/bổ trợ cho báo cáo. Tài liệu hiện tại của bạn cũng đã có danh mục hình giao diện ở Chương 6, nên skill này nên ép AI bổ sung tài liệu đúng lúc, đúng chỗ, không tạo lan nhiều file.  

````markdown
# Skill 08: Graduation Documentation Update

Skill này quy định cách Agent phải cập nhật tài liệu tốt nghiệp khi hoàn thiện một chức năng lớn trong dự án Mini-ERP Nhôm Kính.

Mục tiêu của skill này là đảm bảo các chức năng lớn sau khi đã code xong, test xong, self-review xong và được tester/reviewer xác nhận pass thì mới được bổ sung vào tài liệu tốt nghiệp.

Agent không được tạo nhiều tài liệu rời rạc.  
Agent phải ưu tiên cập nhật vào tài liệu đặc tả/tài liệu tổng hợp trong thư mục:

```text
D:\MiniERP_NhomKinh\TaiLieuDacTa
````

---

# 1. Vai trò của skill

Khi một chức năng lớn đã hoàn thiện 100%, Agent phải hỗ trợ bổ sung nội dung tài liệu cho chức năng đó.

Tài liệu bổ sung phải giúp người đọc hiểu:

* Chức năng này giải quyết vấn đề gì.
* Chức năng này thuộc module nào.
* Ai là người sử dụng chức năng.
* Luồng nghiệp vụ của chức năng là gì.
* Dữ liệu vào/ra là gì.
* Giao diện chức năng gồm những màn hình nào.
* Backend/API/Database liên quan nếu có.
* Kết quả đạt được là gì.
* Có hạn chế hoặc hướng phát triển gì không.

Agent phải chừa vị trí rõ ràng để người dùng chèn ảnh giao diện.

---

# 2. Khi nào được phép cập nhật tài liệu?

Chỉ được cập nhật tài liệu khi chức năng đã hoàn thiện 100%.

Một chức năng được xem là đủ điều kiện cập nhật tài liệu khi thỏa mãn tất cả điều kiện sau:

1. Code đã hoàn thành trong phạm vi chức năng.
2. Lint/build pass.
3. Self-review không còn P0.
4. Runtime test đã được thực hiện.
5. Tester/reviewer xác nhận chức năng pass.
6. Flow nghiệp vụ chính đã chạy đúng.
7. Không còn lỗi nghiêm trọng.
8. Không còn thay đổi lớn dự kiến ngay sau đó.

Nếu chưa đủ các điều kiện trên, Agent không được cập nhật tài liệu chính thức.

Agent chỉ được ghi:

```text
Chức năng chưa được cập nhật vào tài liệu vì chưa tester/reviewer xác nhận pass cuối.
```

---

# 3. Khi nào chưa được cập nhật tài liệu?

Không cập nhật tài liệu nếu chức năng chỉ mới ở một trong các trạng thái sau:

* Mới code xong.
* Chỉ mới lint/build pass.
* Chưa runtime test.
* Chưa tester duyệt.
* Vẫn còn P0.
* Flow nghiệp vụ còn đang đổi.
* UI còn đang sửa lớn.
* Backend/API còn chưa ổn định.
* Database/migration chưa chốt.
* Chỉ mới audit/phân tích.
* Chỉ mới demo tạm.
* Chỉ mới làm nháp.

Ví dụ:

```text
Sai:
Code xong trang Worker Proposal là cập nhật tài liệu ngay.

Đúng:
Chỉ cập nhật tài liệu Worker Proposal sau khi Worker tạo proposal thật, Admin xem/duyệt/từ chối được, runtime pass và tester xác nhận.
```

---

# 4. Thế nào là chức năng lớn?

Chức năng lớn là chức năng có ảnh hưởng rõ đến nghiệp vụ, tài liệu đặc tả hoặc báo cáo tốt nghiệp.

Ví dụ chức năng lớn:

* Tạo đơn hàng
* Lập BOM
* Báo giá
* Thanh toán
* Quản lý kho phôi
* Tạo sơ đồ cắt vật tư
* Tối ưu cắt vật tư
* Worker xem sơ đồ cắt
* Worker xác nhận hoàn thành cắt
* Worker báo sự cố
* Worker gửi đề xuất điều chỉnh phương án cắt
* Admin duyệt/từ chối đề xuất cắt
* Dashboard hỗ trợ ra quyết định
* Upload ảnh công trình/sự cố
* Phân quyền Admin/Worker
* Deploy production

Ví dụ không phải chức năng lớn:

* Đổi màu nút nhỏ.
* Sửa typo.
* Đổi wording nhỏ.
* Refactor component không đổi nghiệp vụ.
* Sửa spacing UI.
* Sửa lỗi lint nhỏ.
* Đổi tên biến nội bộ.

Các thay đổi nhỏ chỉ ghi vào handoff report, không cần cập nhật tài liệu tốt nghiệp riêng.

---

# 5. Không tạo nhiều tài liệu

Agent không được tạo mỗi chức năng một file tài liệu riêng nếu không được yêu cầu.

Không tạo kiểu:

```text
TaiLieuDacTa/worker-proposal.md
TaiLieuDacTa/admin-proposal.md
TaiLieuDacTa/toi-uu-cat.md
TaiLieuDacTa/upload-anh.md
TaiLieuDacTa/dashboard.md
```

Trừ khi người dùng yêu cầu rõ.

Ưu tiên tạo hoặc cập nhật một tài liệu tổng hợp duy nhất, ví dụ:

```text
D:\MiniERP_NhomKinh\TaiLieuDacTa\TaiLieuBoSungChucNang.md
```

hoặc nếu dự án đã có file đặc tả chính trong thư mục này, Agent phải cập nhật vào file đặc tả chính đó.

Nếu trong `TaiLieuDacTa` đã tồn tại tài liệu chính, Agent phải ưu tiên cập nhật tài liệu chính thay vì tạo file mới.

Nếu chưa rõ file nào là tài liệu chính, Agent phải hỏi người dùng trước khi tạo file mới.

---

# 6. Vị trí lưu tài liệu

Tất cả tài liệu bổ sung chức năng phải nằm trong:

```text
D:\MiniERP_NhomKinh\TaiLieuDacTa
```

Không lưu tài liệu ở:

```text
FE/
BE/
supabase_scripts/
src/
root project nếu không cần
```

Không lưu lẫn tài liệu tốt nghiệp với code source.

Nếu cần ảnh giao diện, đề xuất lưu ảnh trong thư mục con:

```text
D:\MiniERP_NhomKinh\TaiLieuDacTa\images
```

hoặc:

```text
D:\MiniERP_NhomKinh\TaiLieuDacTa\screenshots
```

Không tự tạo nhiều thư mục ảnh theo module nếu chưa cần.

---

# 7. Quy tắc chèn ảnh giao diện

Khi viết tài liệu cho chức năng lớn, Agent phải chừa vị trí rõ ràng để người dùng chèn ảnh giao diện.

Mỗi ảnh phải có:

* Vị trí chèn ảnh.
* Tên hình.
* Mô tả ảnh.
* Gợi ý route/màn hình cần chụp.
* Gợi ý trạng thái dữ liệu cần chụp.

Mẫu placeholder:

```markdown
[CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]

Hình X.Y. Giao diện [tên màn hình/chức năng]

Gợi ý ảnh cần chụp:
- Route: `/admin/toi-uu-cat`
- Trạng thái: danh sách phân công có dữ liệu
- Nội dung cần thấy: search, filter, danh sách phân công, nút “Xem chi tiết”
```

Nếu một chức năng có nhiều màn hình, mỗi màn hình cần một placeholder riêng.

Ví dụ:

```markdown
[CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]

Hình X.Y. Giao diện danh sách phân công cần tối ưu cắt vật tư

Gợi ý ảnh cần chụp:
- Route: `/admin/toi-uu-cat`
- Cần thấy danh sách phân công, bộ lọc và nút xem chi tiết
```

```markdown
[CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]

Hình X.Y. Giao diện chi tiết phân công và sơ đồ cắt

Gợi ý ảnh cần chụp:
- Route: `/admin/toi-uu-cat/[mapc]`
- Cần thấy thông tin phân công, BOM, sơ đồ đã lưu và nút tạo sơ đồ cắt
```

---

# 8. Quy tắc đánh số hình/bảng

Agent phải đánh số hình và bảng theo chương/mục đang dùng trong tài liệu.

Nếu tài liệu đang bổ sung vào Chương 6, hình nên theo dạng:

```text
Hình 6.x. Tên hình
```

Nếu tài liệu đang bổ sung vào Chương 4, use case hoặc đặc tả nên theo dạng:

```text
Bảng 4.x. Tên bảng
```

Nếu chưa xác định được số thứ tự chính xác, Agent dùng placeholder:

```text
Hình X.Y. Tên hình
Bảng X.Y. Tên bảng
```

và ghi chú:

```text
Cần cập nhật lại số hình/bảng theo vị trí cuối cùng trong báo cáo.
```

Không được tự đánh số bừa nếu chưa biết tài liệu chính đang có bao nhiêu hình/bảng.

---

# 9. Cấu trúc tài liệu cho một chức năng lớn

Khi bổ sung tài liệu cho một chức năng lớn, Agent phải dùng cấu trúc sau.

```markdown
## [Tên chức năng]

### 1. Mục đích chức năng

Trình bày chức năng này dùng để làm gì và giải quyết vấn đề gì trong nghiệp vụ.

### 2. Tác nhân sử dụng

Liệt kê người dùng liên quan:
- Admin
- Worker
- Khách hàng nếu có
- Hệ thống

### 3. Điều kiện sử dụng

Nêu điều kiện để dùng chức năng:
- Người dùng phải đăng nhập
- Role cần có
- Dữ liệu cần tồn tại
- Trạng thái nghiệp vụ cần phù hợp

### 4. Luồng xử lý chính

Mô tả luồng từng bước.

### 5. Luồng ngoại lệ

Mô tả các trường hợp lỗi hoặc trạng thái đặc biệt.

### 6. Dữ liệu đầu vào

Liệt kê dữ liệu người dùng nhập hoặc hệ thống nhận.

### 7. Dữ liệu đầu ra

Liệt kê dữ liệu hệ thống tạo ra, cập nhật hoặc hiển thị.

### 8. Giao diện chức năng

Chừa vị trí chèn ảnh giao diện.

### 9. API/Backend liên quan

Nếu có, liệt kê endpoint/service/RPC liên quan.

### 10. Bảng dữ liệu liên quan

Nếu có, liệt kê bảng DB liên quan.

### 11. Quy tắc nghiệp vụ

Liệt kê rule quan trọng.

### 12. Kết quả đạt được

Nêu chức năng đã giải quyết được gì.

### 13. Hạn chế và hướng phát triển

Nêu phần còn giới hạn hoặc có thể cải tiến.
```

---

# 10. Văn phong tài liệu tốt nghiệp

Tài liệu phải viết theo văn phong học thuật, rõ ràng, khách quan.

Không viết kiểu chat.

Không dùng:

```text
xịn
ngon
siêu ngon
auto
fix ngu
bị ngu
nát
ok rồi
```

Nên dùng:

```text
hệ thống
chức năng
quy trình
nghiệp vụ
tác nhân
dữ liệu
xử lý
kiểm tra
xác nhận
đề xuất
duyệt
từ chối
```

Không nói quá mức.

Tránh:

```text
tối ưu tuyệt đối
an toàn tuyệt đối
không bao giờ lỗi
giảm 100% hao hụt
AI tự động thông minh
```

Nên dùng:

```text
hỗ trợ tối ưu
giảm hao hụt trong phạm vi mô phỏng
hỗ trợ ra quyết định
kiểm soát tốt hơn
chuẩn hóa quy trình
hạn chế sai sót
```

---

# 11. Quy tắc trung thực học thuật

Agent không được bịa kết quả.

Không được ghi:

* Đã triển khai nếu chưa triển khai.
* Đã test nếu chưa test.
* Đã pass nếu tester chưa duyệt.
* Có ảnh giao diện nếu chưa có ảnh.
* Có API nếu chưa có API.
* Có dashboard nếu chưa làm.
* Có thuật toán AI/ML nếu chỉ là heuristic/rule-based.
* Tối ưu tuyệt đối nếu chỉ là hỗ trợ tối ưu.

Nếu chức năng dùng heuristic, phải ghi đúng:

```text
Hệ thống sử dụng phương pháp heuristic/rule-based để hỗ trợ tạo phương án cắt, không khẳng định tìm được nghiệm tối ưu tuyệt đối trong mọi trường hợp.
```

Nếu chưa có ảnh, chỉ để placeholder.

Nếu chưa có runtime test, không cập nhật tài liệu chính thức.

---

# 12. Quy tắc không cập nhật tài liệu quá sớm

Agent phải luôn kiểm tra trạng thái chức năng trước khi cập nhật tài liệu.

Trước khi viết tài liệu, Agent phải hỏi hoặc xác nhận:

```text
Chức năng này đã được tester/reviewer xác nhận pass cuối chưa?
```

Nếu câu trả lời là chưa, Agent chỉ được tạo nháp nội dung, không ghi vào tài liệu chính.

Có thể tạo nội dung nháp trong phản hồi hoặc file tạm nếu được yêu cầu, nhưng phải ghi rõ:

```text
Nội dung này là bản nháp, chưa được đưa vào tài liệu chính vì chức năng chưa pass cuối.
```

Không cập nhật vào:

```text
D:\MiniERP_NhomKinh\TaiLieuDacTa
```

nếu chức năng chưa hoàn thiện 100%.

---

# 13. Quy trình cập nhật tài liệu

Khi một chức năng lớn đã pass 100%, Agent thực hiện quy trình sau:

## Bước 1: Xác nhận điều kiện

Kiểm tra:

* Chức năng đã code xong.
* Lint/build pass.
* Runtime test pass.
* Tester/reviewer xác nhận.
* Không còn P0.
* Không còn thay đổi lớn ngay sau đó.

## Bước 2: Xác định tài liệu cần cập nhật

Kiểm tra thư mục:

```text
D:\MiniERP_NhomKinh\TaiLieuDacTa
```

Nếu có tài liệu chính, cập nhật vào đó.

Nếu chưa có tài liệu chính, hỏi người dùng trước khi tạo:

```text
Trong `TaiLieuDacTa` chưa thấy tài liệu chính. Có tạo `TaiLieuBoSungChucNang.md` làm tài liệu tổng hợp không?
```

## Bước 3: Xác định vị trí chèn

Xác định chức năng thuộc chương/mục nào:

* Chương 3: Mô tả tổng quan hệ thống
* Chương 4: Đặc tả yêu cầu chi tiết
* Chương 5: Phân tích và thiết kế hệ thống
* Chương 6: Mô phỏng hoạt động/giao diện/kết quả
* Chương 7: Kết luận/hướng phát triển

Nếu không rõ, hỏi người dùng.

## Bước 4: Viết nội dung

Viết theo cấu trúc chức năng lớn.

## Bước 5: Thêm placeholder ảnh

Mỗi giao diện chính phải có chỗ chèn ảnh.

## Bước 6: Cập nhật danh mục hình/bảng nếu có

Nếu tài liệu chính có danh mục hình/bảng, Agent phải nhắc người dùng cập nhật lại danh mục sau khi chèn ảnh thật.

## Bước 7: Báo cáo

Báo cáo:

* Đã cập nhật file nào.
* Thêm mục nào.
* Chức năng nào.
* Có bao nhiêu placeholder ảnh.
* Cần người dùng chèn ảnh nào.
* Có cần cập nhật mục lục/danh mục hình không.

---

# 14. Gợi ý vị trí tài liệu theo loại chức năng

## 14.1. Chức năng nghiệp vụ mới

Ví dụ:

* Worker Proposal
* Admin duyệt proposal
* Upload ảnh sự cố
* Dashboard DSS

Nên bổ sung vào:

```text
Chương 4. Đặc tả yêu cầu chi tiết
Chương 6. Mô phỏng hoạt động hệ thống
```

## 14.2. Thay đổi UI lớn

Ví dụ:

* Tách trang `/admin/toi-uu-cat` list/detail
* Thiết kế lại kho phôi
* Thiết kế lại dashboard

Nên bổ sung vào:

```text
Chương 6. Mô phỏng hoạt động hệ thống
```

Nếu UI phản ánh thay đổi nghiệp vụ, bổ sung thêm:

```text
Chương 4. Đặc tả yêu cầu chi tiết
```

## 14.3. Thay đổi database lớn

Ví dụ:

* Thêm bảng proposal
* Thêm bảng hình ảnh
* Thêm bảng dashboard metrics

Nên bổ sung vào:

```text
Chương 5. Phân tích và thiết kế hệ thống
```

## 14.4. Thay đổi thuật toán/heuristic

Ví dụ:

* Tối ưu cắt vật tư
* Rule ưu tiên phôi dư
* Safe margin/kerf
* Look-ahead đơn giản

Nên bổ sung vào:

```text
Chương 2. Cơ sở lý thuyết
Chương 6. Mô phỏng hoạt động hệ thống
```

---

# 15. Template tài liệu cho chức năng Worker Proposal

Dùng khi chức năng Worker gửi đề xuất điều chỉnh phương án cắt đã pass cuối.

```markdown
## Chức năng đề xuất điều chỉnh phương án cắt của Worker

### 1. Mục đích chức năng

Chức năng đề xuất điều chỉnh phương án cắt cho phép thợ gia công gửi phương án cắt thực tế lên Admin trong trường hợp phương án lý thuyết ban đầu không còn phù hợp với điều kiện tại xưởng. Chức năng này giúp hệ thống phản ánh tốt hơn sự khác biệt giữa dữ liệu quản lý và tình huống sản xuất thực tế, đồng thời vẫn đảm bảo Admin là người duyệt cuối trước khi thay đổi sơ đồ cắt chính thức.

### 2. Tác nhân sử dụng

- Worker: xem sơ đồ cắt đang được giao, nhập phương án đề xuất và gửi lý do.
- Admin: xem xét, duyệt hoặc từ chối đề xuất.
- Hệ thống: kiểm tra tính hợp lệ của phương án và tính toán các chỉ số liên quan.

### 3. Điều kiện sử dụng

- Worker phải đăng nhập vào hệ thống.
- Worker chỉ được thao tác với phân công thuộc về mình.
- Phân công phải tồn tại trong hệ thống.
- Phương án đề xuất phải dựa trên BOM và phôi hợp lệ.
- Proposal chỉ được duyệt khi còn ở trạng thái chờ duyệt.

### 4. Luồng xử lý chính

1. Worker mở màn hình cắt theo phân công được giao.
2. Worker xem sơ đồ cắt hiện tại do Admin tạo.
3. Worker chọn chức năng tạo đề xuất điều chỉnh.
4. Worker nhập hoặc chỉnh phương án cắt thực tế.
5. Worker nhập lý do đề xuất.
6. Hệ thống gửi proposal lên backend.
7. Backend kiểm tra quyền, dữ liệu BOM, phôi và chiều dài cắt.
8. Hệ thống lưu proposal ở trạng thái chờ duyệt.
9. Admin xem proposal trên màn hình quản lý đề xuất.
10. Admin duyệt hoặc từ chối proposal.

### 5. Luồng ngoại lệ

- Nếu Worker gửi proposal cho phân công không thuộc mình, hệ thống từ chối thao tác.
- Nếu phôi không tồn tại hoặc đã bị bỏ đi, hệ thống không cho tạo proposal.
- Nếu tổng chiều dài cắt vượt quá chiều dài dùng được của phôi, hệ thống báo lỗi.
- Nếu proposal đã hết hiệu lực do sơ đồ đã được cắt hoặc hoàn thành, hệ thống không cho duyệt.

### 6. Dữ liệu đầu vào

- Mã phân công
- Danh sách phôi đề xuất
- Danh sách nhát cắt đề xuất
- Chiều dài cắt
- Thứ tự cắt
- Lý do đề xuất

### 7. Dữ liệu đầu ra

- Proposal mới ở trạng thái chờ duyệt
- Chi tiết proposal
- Kết quả duyệt hoặc từ chối của Admin
- Trạng thái proposal sau xử lý

### 8. Giao diện chức năng

[CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]

Hình X.Y. Giao diện Worker tạo đề xuất điều chỉnh phương án cắt

Gợi ý ảnh cần chụp:
- Route: `/worker/cat?mapc=...`
- Trạng thái: modal tạo đề xuất đang mở
- Nội dung cần thấy: sơ đồ cắt đang giao, phương án Worker đề xuất, ô nhập lý do, nút gửi Admin duyệt

[CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]

Hình X.Y. Giao diện Admin xem chi tiết đề xuất cắt

Gợi ý ảnh cần chụp:
- Route: `/admin/de-xuat-cat`
- Trạng thái: đang mở chi tiết một proposal
- Nội dung cần thấy: thông tin proposal, lý do đề xuất, danh sách phôi/nhát cắt, nút duyệt và từ chối

### 9. API/Backend liên quan

- API Worker tạo proposal
- API Worker xem danh sách proposal của mình
- API Admin xem proposal
- API Admin duyệt proposal
- API Admin từ chối proposal
- RPC duyệt proposal
- RPC từ chối proposal

### 10. Bảng dữ liệu liên quan

- `dexuatcat`
- `chitietdexuatcat`
- `phancong`
- `sodocat`
- `chitietcat`
- `khothanhphoi`
- `chitietdh`

### 11. Quy tắc nghiệp vụ

- Worker không được sửa sơ đồ cắt chính thức.
- Worker chỉ gửi đề xuất.
- Admin là người duyệt cuối.
- Backend tự kiểm tra tính hợp lệ của phương án.
- Backend không tin các chỉ số do frontend gửi.
- Việc duyệt proposal phải đảm bảo không làm sai lệch dữ liệu sản xuất đang diễn ra.

### 12. Kết quả đạt được

Chức năng giúp tăng tính linh hoạt cho quy trình sản xuất, cho phép thợ phản hồi các tình huống phát sinh tại xưởng nhưng vẫn giữ quyền kiểm soát cuối cùng cho Admin. Nhờ đó, hệ thống vừa hỗ trợ quản lý chặt chẽ, vừa phản ánh tốt hơn thực tế gia công.

### 13. Hạn chế và hướng phát triển

Hiện tại Worker vẫn cần nhập một số thông tin kỹ thuật như mã phôi hoặc mã chi tiết đơn hàng. Trong tương lai, hệ thống có thể cải tiến giao diện chọn dữ liệu trực quan hơn, hỗ trợ quét mã phôi hoặc gợi ý phương án dựa trên dữ liệu tồn kho thực tế.
```

---

# 16. Template tài liệu cho chức năng Tối ưu cắt vật tư

Dùng khi chức năng tối ưu cắt vật tư đã pass cuối.

```markdown
## Chức năng tối ưu cắt vật tư

### 1. Mục đích chức năng

Chức năng tối ưu cắt vật tư hỗ trợ Admin lập sơ đồ cắt cho các phân công sản xuất dựa trên BOM và kho phôi hiện có. Mục tiêu của chức năng là giảm hao hụt vật tư, ưu tiên tận dụng phôi dư và chuẩn hóa dữ liệu cắt trước khi chuyển xuống xưởng.

### 2. Tác nhân sử dụng

- Admin: chọn phân công, xem BOM, tạo sơ đồ cắt.
- Worker: nhận và thực hiện theo sơ đồ cắt được giao.
- Hệ thống: tính toán phương án cắt dựa trên dữ liệu BOM, phôi và quy tắc cắt.

### 3. Điều kiện sử dụng

- Admin phải đăng nhập.
- Đơn hàng đã có BOM.
- Phân công đã được tạo.
- Kho phôi có vật tư phù hợp.
- Phôi phải ở trạng thái khả dụng.

### 4. Luồng xử lý chính

1. Admin mở trang tối ưu cắt vật tư.
2. Hệ thống hiển thị danh sách phân công cần lập sơ đồ cắt.
3. Admin chọn một phân công để xem chi tiết.
4. Hệ thống hiển thị BOM và sơ đồ đã lưu nếu có.
5. Admin bấm tạo sơ đồ cắt.
6. Hệ thống tính toán phương án cắt dựa trên dữ liệu BOM và kho phôi.
7. Hệ thống lưu sơ đồ cắt.
8. Worker có thể xem sơ đồ cắt được giao.

### 5. Luồng ngoại lệ

- Nếu phân công chưa có BOM, hệ thống không thể tạo sơ đồ.
- Nếu kho không đủ phôi phù hợp, hệ thống báo lỗi.
- Nếu sơ đồ đã hoàn thành, hệ thống không cho ghi đè trực tiếp.
- Nếu dữ liệu phôi thay đổi, Admin cần tạo hoặc kiểm tra lại phương án.

### 6. Dữ liệu đầu vào

- Mã phân công
- BOM cần cắt
- Danh sách phôi khả dụng
- Quy tắc kerf
- Safe margin
- Chiều dài tối thiểu có thể tái sử dụng

### 7. Dữ liệu đầu ra

- Sơ đồ cắt theo từng phôi
- Danh sách nhát cắt
- Chiều dài đã dùng
- Phần dư
- Tỷ lệ sử dụng
- Trạng thái sơ đồ

### 8. Giao diện chức năng

[CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]

Hình X.Y. Giao diện danh sách phân công cần tối ưu cắt vật tư

Gợi ý ảnh cần chụp:
- Route: `/admin/toi-uu-cat`
- Trạng thái: có danh sách phân công
- Nội dung cần thấy: search, filter, danh sách phân công, nút xem chi tiết

[CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]

Hình X.Y. Giao diện chi tiết phân công và sơ đồ cắt

Gợi ý ảnh cần chụp:
- Route: `/admin/toi-uu-cat/[mapc]`
- Trạng thái: đã chọn một phân công
- Nội dung cần thấy: thông tin phân công, BOM, tiêu chí tối ưu, sơ đồ đã lưu, nút tạo sơ đồ cắt

[CHÈN ẢNH GIAO DIỆN TẠI ĐÂY]

Hình X.Y. Giao diện kết quả sơ đồ cắt trên từng thanh phôi

Gợi ý ảnh cần chụp:
- Trạng thái: sau khi tạo sơ đồ cắt thành công
- Nội dung cần thấy: UID phôi, chiều dài đã dùng, phần dư, các nhát cắt, tỷ lệ sử dụng

### 9. API/Backend liên quan

- API danh sách phân công
- API chi tiết phân công
- API tạo sơ đồ cắt
- API lấy sơ đồ cắt theo phân công

### 10. Bảng dữ liệu liên quan

- `phancong`
- `donhang`
- `chitietdh`
- `khothanhphoi`
- `sodocat`
- `chitietcat`
- `quytac`

### 11. Quy tắc nghiệp vụ

- Tạo sơ đồ cắt không đồng nghĩa với trừ kho.
- Kho chỉ được cập nhật khi hoàn thành cắt.
- Hệ thống ưu tiên phôi dư nếu phù hợp.
- Phôi bỏ đi không được sử dụng.
- Phải tính hao hụt do lưỡi cắt và khoảng chừa an toàn.
- Không ghi đè sơ đồ đã hoàn thành nếu không có flow xử lý riêng.

### 12. Kết quả đạt được

Chức năng giúp Admin lập phương án cắt có hệ thống, giảm phụ thuộc vào kinh nghiệm thủ công của thợ và hỗ trợ tận dụng phôi dư trong kho. Việc lưu sơ đồ cắt cũng giúp Worker có căn cứ rõ ràng khi gia công và giúp Admin theo dõi sản xuất chính xác hơn.

### 13. Hạn chế và hướng phát triển

Hiện tại chức năng sử dụng phương pháp heuristic/rule-based để hỗ trợ tạo sơ đồ cắt. Trong tương lai, hệ thống có thể nghiên cứu thêm các phương pháp tối ưu nâng cao như Integer Programming, Branch and Bound hoặc cơ chế mô phỏng nhiều phương án trước khi lưu chính thức.
```

---

# 17. Output bắt buộc sau khi cập nhật tài liệu

Sau khi cập nhật tài liệu, Agent phải báo cáo:

```text
## 1. Tài liệu đã cập nhật
- File:

## 2. Chức năng được bổ sung
- Tên chức năng:

## 3. Vị trí bổ sung
- Chương/mục:

## 4. Nội dung đã thêm
- Mục đích:
- Tác nhân:
- Luồng xử lý:
- Dữ liệu vào/ra:
- API/DB liên quan:
- Quy tắc nghiệp vụ:
- Kết quả:
- Hạn chế:

## 5. Placeholder ảnh đã thêm
- Hình X.Y:
- Hình X.Y:

## 6. Cần người dùng bổ sung
- Ảnh giao diện:
- Cập nhật lại số hình/bảng:
- Cập nhật mục lục/danh mục hình nếu dùng Word:

## 7. Điều kiện
- Chức năng đã tester/reviewer xác nhận pass chưa:
- Nếu chưa, đây chỉ là bản nháp hay đã đưa vào tài liệu chính:
```

---

# 18. Tiêu chuẩn hoàn thành Skill 08

Skill này được xem là làm đúng khi Agent:

* Chỉ cập nhật tài liệu khi chức năng lớn đã pass 100%.
* Không cập nhật tài liệu quá sớm.
* Không tạo nhiều tài liệu rời rạc.
* Lưu đúng trong `D:\MiniERP_NhomKinh\TaiLieuDacTa`.
* Viết theo văn phong tốt nghiệp.
* Không bịa chức năng/kết quả.
* Có chỗ chèn ảnh giao diện.
* Có tên hình rõ ràng.
* Có mô tả route/trạng thái cần chụp.
* Có API/DB/rule nếu chức năng liên quan.
* Báo cáo rõ đã cập nhật file nào.
* Nhắc cập nhật mục lục/danh mục hình nếu dùng Word.

Skill này làm sai nếu Agent:

* Vừa code xong đã cập nhật tài liệu chính.
* Chưa tester duyệt nhưng ghi như đã hoàn thiện.
* Tạo mỗi chức năng một file riêng không cần thiết.
* Lưu tài liệu trong FE/BE.
* Không chừa chỗ chèn ảnh.
* Đánh số hình/bảng bừa.
* Viết văn phong chat.
* Nói quá mức như “tối ưu tuyệt đối”.
* Ghi chức năng chưa làm vào báo cáo chính thức.

```
```
