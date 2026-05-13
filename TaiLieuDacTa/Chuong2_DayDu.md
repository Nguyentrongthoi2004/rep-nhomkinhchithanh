# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG

## 2.1. Tổng quan về hệ thống Mini-ERP

### 2.1.1. Khái niệm ERP

ERP (Enterprise Resource Planning – Hoạch định nguồn lực doanh nghiệp) là hệ thống phần mềm tích hợp, cho phép doanh nghiệp quản lý đồng bộ các hoạt động nghiệp vụ cốt lõi bao gồm tài chính, nhân sự, sản xuất, kho vận và bán hàng trên một nền tảng dữ liệu thống nhất. Các hệ thống ERP thương mại phổ biến trên thị trường như SAP ERP, Oracle ERP Cloud hay Microsoft Dynamics 365 thường được thiết kế cho doanh nghiệp quy mô vừa và lớn, đòi hỏi chi phí triển khai cao, thời gian đào tạo dài và đội ngũ vận hành chuyên nghiệp.

### 2.1.2. Khái niệm Mini-ERP

Mini-ERP là phiên bản thu gọn của hệ thống ERP truyền thống, được thiết kế dành cho các cơ sở sản xuất kinh doanh quy mô nhỏ và siêu nhỏ. Thay vì bao phủ toàn bộ nghiệp vụ của một doanh nghiệp lớn, Mini-ERP chỉ tập trung vào các chức năng thiết yếu nhất, phù hợp với đặc thù ngành nghề và quy mô hoạt động cụ thể.

Hệ thống Mini-ERP trong đề tài này không hướng đến việc xây dựng một giải pháp ERP đầy đủ, mà tập trung vào các nghiệp vụ cốt lõi của xưởng gia công nhôm kính, bao gồm các nhóm chức năng được liệt kê trong Bảng 2.1.

**Bảng 2.1. Các nghiệp vụ chính của hệ thống Mini-ERP**

| STT | Nghiệp vụ | Mô tả |
|:---:|-----------|-------|
| 1 | Quản lý khách hàng | Lưu trữ thông tin khách hàng, lịch sử đơn hàng, tra cứu nhanh qua số điện thoại |
| 2 | Quản lý đơn hàng và báo giá | Tạo đơn hàng, theo dõi vòng đời từ báo giá đến hoàn thành |
| 3 | Bóc tách vật tư (BOM) | Tính toán tự động danh sách vật tư cần dùng từ thông tin đơn hàng |
| 4 | Quản lý vật tư và danh mục | Quản lý dữ liệu gốc về nhôm, kính, phụ kiện, vật tư phụ và nhân công |
| 5 | Quản lý kho phôi | Theo dõi thanh nhôm nguyên và phôi dư sau khi cắt |
| 6 | Tối ưu cắt phôi (1D-CSP) | Tạo sơ đồ cắt tối ưu nhằm giảm thiểu hao hụt vật liệu |
| 7 | Phân công thợ gia công | Giao việc cho thợ theo từng đơn hàng, theo dõi tiến độ |
| 8 | Quản lý công nợ và giao dịch | Theo dõi đặt cọc, tạm ứng, hoàn tất thanh toán |
| 9 | Nhật ký gia công | Ghi lại lịch sử mọi thao tác cắt trên từng thanh phôi |
| 10 | Thông báo hệ thống | Gửi thông báo đến người dùng theo vai trò |

### 2.1.3. Lý do chọn mô hình Mini-ERP

Trong bối cảnh các xưởng nhôm kính quy mô nhỏ vận hành chủ yếu bằng sổ tay, kinh nghiệm cá nhân và trao đổi qua tin nhắn, việc triển khai một hệ thống ERP đầy đủ là không khả thi về cả chi phí lẫn năng lực sử dụng. Tuy nhiên, xưởng vẫn đối mặt với các vấn đề cần được giải quyết bằng công nghệ thông tin:

- **Sai sót trong ghi chép:** Nhầm lẫn kích thước, số lượng khi truyền đạt bằng miệng hoặc ghi chép thủ công.
- **Thất thoát vật tư:** Phôi dư sau khi cắt không được theo dõi, dẫn đến lãng phí nhôm thanh.
- **Khó tra cứu:** Lịch sử đơn hàng, công nợ, tiến độ sản xuất phân tán ở nhiều nơi.
- **Thông tin không đồng bộ:** Dữ liệu giữa khâu bán hàng, sản xuất và tài chính không liên kết.

Mini-ERP đóng vai trò là công cụ trung tâm giúp số hóa và liên kết dữ liệu giữa các khâu trong xưởng, từ tiếp nhận đơn hàng, báo giá, bóc tách vật tư, sản xuất đến thanh toán và quản lý công nợ.

---

## 2.2. Kiến trúc Client-Server và mô hình ứng dụng web

### 2.2.1. Mô hình Client-Server

Hệ thống Mini-ERP trong đề tài được xây dựng theo kiến trúc Client-Server, một mô hình phổ biến trong phát triển ứng dụng web hiện đại. Trong mô hình này:

- **Client (máy khách)** là trình duyệt web chạy trên điện thoại thông minh, máy tính bảng hoặc máy tính để bàn. Client chịu trách nhiệm hiển thị giao diện, thu thập thao tác của người dùng và gửi yêu cầu đến server.
- **Server (máy chủ)** bao gồm tầng xử lý logic nghiệp vụ (backend API) và tầng lưu trữ dữ liệu (cơ sở dữ liệu). Server tiếp nhận yêu cầu từ client, thực hiện xử lý và trả kết quả về dưới dạng dữ liệu JSON.

Luồng hoạt động tổng quát của hệ thống được mô tả như sau: người dùng thao tác trên giao diện, client gửi yêu cầu HTTP đến backend API, backend xử lý logic nghiệp vụ và truy vấn cơ sở dữ liệu, sau đó trả kết quả về cho client để cập nhật giao diện.

### 2.2.2. Kiến trúc ba tầng của hệ thống

Hệ thống được tổ chức theo kiến trúc ba tầng như trình bày trong Bảng 2.2.

**Bảng 2.2. Kiến trúc ba tầng của hệ thống**

| Tầng | Công nghệ chính | Vai trò |
|------|-----------------|---------|
| Giao diện (Frontend) | Next.js, React, TypeScript | Hiển thị giao diện người dùng, xử lý tương tác |
| Xử lý nghiệp vụ (Backend) | Express.js, TypeScript | Xử lý logic nghiệp vụ, xác thực, phân quyền |
| Lưu trữ dữ liệu (Database) | Supabase, PostgreSQL | Lưu trữ dữ liệu tập trung trên cloud |

Kiến trúc ba tầng này phù hợp với đề tài vì dữ liệu xưởng cần được đồng bộ giữa nhiều người dùng: chủ xưởng có thể tạo đơn hàng, lập báo giá, theo dõi công nợ từ bất kỳ thiết bị nào có trình duyệt web; thợ gia công có thể xem sơ đồ cắt, xác nhận hoàn thành công việc hoặc báo cáo sự cố ngay tại xưởng.

### 2.2.3. Tổ chức mã nguồn

Mã nguồn hệ thống được tổ chức thành ba phần chính: thư mục Frontend chứa ứng dụng Next.js với các trang giao diện, component tái sử dụng, thư viện tiện ích và quản lý trạng thái; thư mục Backend chứa ứng dụng Express.js với 17 module nghiệp vụ, middleware xác thực và cấu hình kết nối; thư mục SQL Scripts chứa các tệp định nghĩa lược đồ cơ sở dữ liệu và dữ liệu mẫu. Chi tiết cấu trúc thư mục được trình bày trong phần Phụ lục.

---

## 2.3. Thiết kế giao diện theo hướng Mobile-First

### 2.3.1. Khái niệm Mobile-First

Mobile-First là phương pháp thiết kế giao diện người dùng trong đó ưu tiên thiết kế cho thiết bị di động (màn hình nhỏ) trước, sau đó mới mở rộng và bổ sung bố cục cho các thiết bị có màn hình lớn hơn. Phương pháp này dựa trên nguyên tắc: nếu giao diện hoạt động tốt trên màn hình nhỏ với nhiều giới hạn, thì việc mở rộng cho màn hình lớn sẽ thuận lợi hơn chiều ngược lại.

### 2.3.2. Lý do áp dụng Mobile-First trong đề tài

Đề tài lựa chọn thiết kế theo hướng Mobile-First dựa trên đặc điểm thực tế của môi trường sử dụng:

- **Đối với thợ gia công:** Người thợ làm việc trong môi trường xưởng có nhiều bụi, có thể đeo găng tay bảo hộ. Do đó giao diện cần có nút bấm kích thước lớn, chữ hiển thị rõ ràng và hạn chế tối đa việc nhập liệu bằng bàn phím. Các màn hình xem sơ đồ cắt, xác nhận hoàn thành hoặc báo cáo sự cố cần được thiết kế tối giản, dễ thao tác chỉ với một tay.
- **Đối với chủ xưởng:** Chủ xưởng cần tra cứu nhanh thông tin đơn hàng, tình trạng công nợ, tiến độ sản xuất và tồn kho vật tư ngay tại công trình hoặc trong khi di chuyển, nơi thiết bị chính là điện thoại thông minh.

### 2.3.3. Phân chia giao diện theo vai trò

Hệ thống phân chia giao diện thành hai nhóm tương ứng với hai vai trò người dùng, được trình bày trong Bảng 2.3 và Bảng 2.4.

**Bảng 2.3. Các module giao diện dành cho Admin (chủ xưởng)**

| STT | Module | Chức năng chính |
|:---:|--------|----------------|
| 1 | Tổng quan (Dashboard) | Hiển thị tổng quan đơn hàng, doanh thu, tiến độ sản xuất |
| 2 | Đơn hàng | Tạo mới, chỉnh sửa và theo dõi trạng thái đơn hàng |
| 3 | Khách hàng | Quản lý hồ sơ khách hàng |
| 4 | Vật tư | Quản lý dữ liệu gốc vật tư |
| 5 | Danh mục | Quản lý nhóm phân loại vật tư |
| 6 | Kho phôi | Theo dõi thanh phôi nguyên và phôi dư |
| 7 | Nhập kho | Quản lý đợt nhập kho |
| 8 | Tối ưu cắt | Tạo sơ đồ cắt tối ưu từ BOM và kho phôi |
| 9 | Phân công | Giao việc cho thợ gia công |
| 10 | Sản xuất | Theo dõi tiến độ sản xuất |
| 11 | Thanh toán | Quản lý giao dịch tài chính và công nợ |
| 12 | Nhân sự | Quản lý thông tin thợ gia công |
| 13 | Cấu hình | Thiết lập các quy tắc và hằng số hệ thống |

**Bảng 2.4. Các module giao diện dành cho Worker (thợ gia công)**

| STT | Module | Chức năng chính |
|:---:|--------|----------------|
| 1 | Tổng quan | Hiển thị tổng quan công việc cá nhân |
| 2 | Nhiệm vụ | Xem danh sách công việc được giao |
| 3 | Máy cắt | Xem sơ đồ cắt, xác nhận hoàn thành, báo lỗi |
| 4 | Kho | Xem tình trạng kho phôi |
| 5 | Lịch | Xem lịch công việc |
| 6 | Cá nhân | Quản lý thông tin tài khoản cá nhân |


---

## 2.4. Công nghệ phát triển giao diện người dùng

### 2.4.1. Next.js

Next.js là framework phát triển ứng dụng web mã nguồn mở, được xây dựng trên nền tảng React và do công ty Vercel phát triển. Next.js mở rộng khả năng của React bằng các tính năng quan trọng cho ứng dụng web thực tế, bao gồm: hệ thống định tuyến tự động dựa trên cấu trúc thư mục (App Router); khả năng render trang ở phía server (Server-Side Rendering) giúp cải thiện tốc độ tải trang và tối ưu cho công cụ tìm kiếm; hỗ trợ tạo API Routes ngay trong project frontend để đóng vai trò proxy chuyển tiếp yêu cầu; và cơ chế Middleware cho phép kiểm tra xác thực, phân quyền trước khi người dùng truy cập trang.

Trong đề tài, Next.js được sử dụng với App Router để tổ chức các trang giao diện theo vai trò. Middleware kiểm tra phiên đăng nhập thông qua Supabase Auth và thực hiện phân quyền giữa vai trò Admin và Worker, đảm bảo mỗi nhóm người dùng chỉ truy cập được các chức năng tương ứng.

### 2.4.2. React

React là thư viện JavaScript mã nguồn mở do Meta (Facebook) phát triển, cho phép xây dựng giao diện người dùng theo mô hình hướng thành phần (component-based). Trong mô hình này, mỗi phần tử giao diện được đóng gói thành một component độc lập với dữ liệu và logic riêng, có thể tái sử dụng ở nhiều nơi trong ứng dụng.

Hệ thống Mini-ERP tận dụng mô hình component của React để tách biệt các thành phần giao diện theo chức năng: component quản lý đơn hàng, component hiển thị sơ đồ cắt, component quản lý công nợ, và các component giao diện dùng chung như bảng dữ liệu, biểu mẫu nhập liệu, hộp thoại xác nhận.

### 2.4.3. TypeScript

TypeScript là ngôn ngữ lập trình mã nguồn mở do Microsoft phát triển, mở rộng JavaScript bằng cách bổ sung hệ thống kiểu dữ liệu tĩnh (static typing). TypeScript giúp phát hiện lỗi ngay trong quá trình viết mã, hỗ trợ trình soạn thảo hiển thị gợi ý và tự động hoàn thành chính xác hơn, đồng thời giúp nhóm phát triển thống nhất cấu trúc dữ liệu giữa frontend và backend.

Trong đề tài, TypeScript được sử dụng ở cả hai tầng frontend và backend. Các kiểu dữ liệu quan trọng như đơn hàng, vật tư, chi tiết cắt, thanh phôi được định nghĩa rõ ràng, giúp giảm thiểu lỗi khi truyền dữ liệu giữa các thành phần.

### 2.4.4. Tailwind CSS

Tailwind CSS là framework CSS theo hướng utility-first, cung cấp các lớp CSS nhỏ gọn (utility class) để xây dựng giao diện trực tiếp trong mã JSX mà không cần viết tệp CSS riêng biệt. Tailwind CSS hỗ trợ sẵn cơ chế responsive và thiết kế Mobile-First thông qua các breakpoint, giúp xây dựng giao diện thích ứng với nhiều kích thước màn hình một cách nhanh chóng và nhất quán.

### 2.4.5. Các thư viện hỗ trợ

Ngoài các công nghệ chính, hệ thống sử dụng một số thư viện hỗ trợ quan trọng được liệt kê trong Bảng 2.5.

**Bảng 2.5. Các thư viện hỗ trợ chính**

| Thư viện | Vai trò trong hệ thống |
|----------|------------------------|
| TanStack React Query | Quản lý trạng thái dữ liệu từ server, cache kết quả API giúp giảm số lần gọi mạng |
| Zustand | Quản lý trạng thái phía client (state management) nhẹ và đơn giản |
| React Hook Form | Quản lý biểu mẫu nhập liệu, tối ưu hiệu suất render |
| Zod | Kiểm tra và xác thực dữ liệu đầu vào ở cả frontend và backend |
| Recharts | Vẽ biểu đồ thống kê trên trang tổng quan (Dashboard) |
| Lucide React | Bộ biểu tượng SVG nhất quán cho giao diện |
| date-fns | Xử lý và định dạng ngày tháng theo tiếng Việt |

---

## 2.5. Công nghệ cơ sở dữ liệu và backend

### 2.5.1. Supabase

Supabase là nền tảng Backend-as-a-Service (BaaS) mã nguồn mở, cung cấp cơ sở dữ liệu PostgreSQL trên cloud kèm theo các dịch vụ tích hợp sẵn bao gồm: xác thực người dùng (Authentication), phân quyền truy cập dữ liệu theo hàng (Row Level Security), lưu trữ tệp (Storage) và API tự động.

Trong đề tài, Supabase đảm nhận hai vai trò chính:

- **Xác thực và phân quyền:** Người dùng đăng nhập bằng email và mật khẩu thông qua Supabase Auth. Hệ thống phân quyền theo hai vai trò: Admin (chủ xưởng) được truy cập toàn bộ chức năng quản lý, tài chính và vật tư; Worker (thợ gia công) chỉ được xem lệnh sản xuất, sơ đồ cắt, xác nhận tiến độ và báo cáo sự cố. Ngoài ra, hệ thống có chức năng yêu cầu cấp quyền cho phép người mới gửi đơn đăng ký và Admin duyệt trước khi cấp tài khoản.
- **Lưu trữ dữ liệu tập trung:** Toàn bộ dữ liệu nghiệp vụ được lưu trữ trên cloud, cho phép cả chủ xưởng và thợ gia công truy cập từ nhiều thiết bị khác nhau, thay thế hoàn toàn việc ghi chép trên sổ sách vật lý.

### 2.5.2. PostgreSQL

PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở, hỗ trợ đầy đủ chuẩn SQL, đảm bảo tính toàn vẹn dữ liệu theo nguyên tắc ACID, và cung cấp các kiểu dữ liệu phong phú bao gồm JSONB, ENUM và ARRAY. PostgreSQL phù hợp với hệ thống Mini-ERP nhờ khả năng quản lý dữ liệu có quan hệ phức tạp giữa nhiều thực thể.

Cơ sở dữ liệu của hệ thống bao gồm 17 bảng, 11 kiểu ENUM và 24 chỉ mục (index), được trình bày trong Bảng 2.6.

**Bảng 2.6. Danh sách các bảng trong cơ sở dữ liệu**

| STT | Tên bảng | Vai trò |
|:---:|----------|---------|
| 1 | quytac | Lưu trữ hằng số sản xuất: độ hao kerf, ngưỡng phế liệu |
| 2 | danhmuc | Nhóm phân loại vật tư: Nhôm, Kính, Phụ kiện, Vật tư phụ, Nhân công |
| 3 | nguoidung | Tài khoản người dùng với vai trò Admin hoặc Worker |
| 4 | yeucaucapquyen | Yêu cầu đăng ký tài khoản chờ Admin phê duyệt |
| 5 | khachhang | Hồ sơ khách hàng, hỗ trợ tra cứu nhanh qua số điện thoại |
| 6 | vattu | Dữ liệu gốc vật tư: tên, đơn vị tính, chiều dài mặc định, đơn giá |
| 7 | lonhap | Đợt nhập kho, ghi nhận nguồn gốc từng lô thanh phôi |
| 8 | khothanhphoi | Theo dõi từng thanh nhôm vật lý với chiều dài hiện tại và trạng thái |
| 9 | donhang | Quản lý vòng đời đơn hàng qua 7 trạng thái, hỗ trợ chốt giá |
| 10 | chitietdh | Bóc tách vật tư (BOM): danh sách linh kiện cần cắt hoặc mua |
| 11 | phancong | Giao việc từ Admin đến thợ gia công theo từng đơn hàng |
| 12 | sodocat | Phương án cắt trên từng thanh phôi cụ thể |
| 13 | chitietcat | Chi tiết từng nhát cắt trên một sơ đồ cắt |
| 14 | nhatkygiacong | Nhật ký ghi lại toàn bộ lịch sử thao tác cắt |
| 15 | giaodich | Các khoản thu chi, là nguồn duy nhất để tính công nợ |
| 16 | hinhanh | Ảnh khảo sát, nghiệm thu và sự cố, lưu dưới dạng URL |
| 17 | thongbao | Thông báo hệ thống gửi đến từng người dùng |

Các bảng trong cơ sở dữ liệu có mối quan hệ chặt chẽ với nhau. Một khách hàng có thể có nhiều đơn hàng; mỗi đơn hàng chứa nhiều chi tiết vật tư (BOM); mỗi đơn hàng được phân công cho thợ gia công; quá trình cắt tạo ra các sơ đồ cắt liên kết với thanh phôi trong kho; và mọi giao dịch tài chính đều gắn với đơn hàng tương ứng. Hệ thống sử dụng 11 kiểu ENUM để quản lý trạng thái có giới hạn, đáng chú ý nhất là vòng đời đơn hàng gồm 7 trạng thái từ báo giá nhập, khảo sát, đã cọc, đang gia công, đang lắp đặt, hoàn thành đến đã hủy. Các kiểu ENUM này giúp giới hạn giá trị trạng thái, tránh nhập sai dữ liệu và đảm bảo tính nhất quán trong quá trình xử lý nghiệp vụ.

### 2.5.3. Backend Express.js

Bên cạnh Supabase, hệ thống sử dụng một tầng backend riêng biệt xây dựng trên Express.js với TypeScript. Backend này đảm nhận các chức năng mà Supabase API tự động không xử lý được, bao gồm: thực thi thuật toán tối ưu cắt phôi, tính toán bóc tách vật tư BOM, xử lý logic giao dịch tài chính phức tạp, và gửi thông báo qua email. Backend sử dụng Supabase Admin Client với Service Role Key để truy cập dữ liệu với quyền quản trị, vượt qua các ràng buộc bảo mật Row Level Security khi cần thiết.


---

## 2.6. Cơ sở lý thuyết về bóc tách vật tư BOM

### 2.6.1. Khái niệm BOM

BOM (Bill of Materials – Bảng định mức vật tư) là tài liệu kỹ thuật liệt kê đầy đủ tất cả nguyên vật liệu, linh kiện và bán thành phẩm cần thiết để sản xuất một sản phẩm hoàn chỉnh. Trong lĩnh vực sản xuất, BOM đóng vai trò là cầu nối giữa khâu thiết kế/bán hàng và khâu sản xuất, giúp chuyển đổi thông tin sản phẩm thành danh sách vật tư chi tiết có thể thi công được.

Đối với xưởng nhôm kính, BOM giúp chuyển đổi từ thông tin đơn hàng bao gồm kích thước cửa, loại cửa và số lượng thành danh sách vật tư cụ thể: thanh nhôm nào cần cắt, chiều dài bao nhiêu milimét, bao nhiêu tấm kính, kèm theo phụ kiện gì.

### 2.6.2. BOM trong hệ thống Mini-ERP

Trong hệ thống, dữ liệu BOM được lưu trữ trong bảng **chitietdh** (chi tiết đơn hàng). Mỗi bản ghi đại diện cho một linh kiện cần sử dụng, bao gồm các thông tin: mã vật tư liên kết đến bảng dữ liệu gốc, mô tả linh kiện (ví dụ: "Cột đứng", "Xà ngang"), chiều dài cần cắt tính bằng mm (chỉ áp dụng cho nhôm thanh, để trống đối với kính và phụ kiện), số lượng, đơn giá đóng băng (Price Freeze) tại thời điểm đặt cọc và thành tiền.

Quy trình bóc tách vật tư diễn ra như sau:

- **Đầu vào:** Thông tin đơn hàng gồm kích thước cửa, loại nhôm, số lượng bộ cửa.
- **Xử lý:** Hệ thống tính toán các đoạn nhôm cần cắt, diện tích kính và phụ kiện đi kèm dựa trên quy tắc gia công của từng loại cửa.
- **Đầu ra:** Danh sách chi tiết vật tư bao gồm mã vật tư, tên linh kiện, chiều dài cắt, số lượng và đơn vị tính.

Ví dụ, một bộ cửa sổ mở quay kích thước 900×1800mm sau khi bóc tách sẽ cho ra danh sách gồm: 2 thanh cột đứng dài 1800mm, 2 thanh xà ngang dài 900mm, 1 tấm kính 5mm, 4 bản lề và các phụ kiện tương ứng. Danh sách này chính là cơ sở để hệ thống tiếp tục chạy thuật toán tối ưu cắt phôi ở bước tiếp theo.

BOM là cầu nối quan trọng giữa khâu bán hàng và khâu sản xuất. Chủ xưởng chỉ cần nhập thông tin tổng quát về đơn hàng, trong khi thợ gia công nhận được danh sách vật tư chi tiết đến từng mm, giảm thiểu sai sót do truyền đạt miệng hoặc ghi chép thủ công.

---

## 2.7. Cơ sở lý thuyết bài toán cắt phôi một chiều (1D-CSP)

### 2.7.1. Giới thiệu bài toán

Bài toán cắt phôi một chiều (One-Dimensional Cutting Stock Problem, viết tắt 1D-CSP) là một bài toán tối ưu hóa tổ hợp kinh điển trong lĩnh vực vận trù học và sản xuất công nghiệp. Bài toán được phát biểu như sau:

> Cho một tập hợp các thanh vật liệu có chiều dài chuẩn (gọi là phôi nguyên) và một danh sách các đoạn cần cắt với chiều dài và số lượng xác định. Hãy tìm phương án cắt sao cho số lượng thanh vật liệu sử dụng là ít nhất, đồng thời lượng vật liệu dư thừa là nhỏ nhất.

Trong đề tài, bài toán 1D-CSP được áp dụng cho việc cắt nhôm thanh định hình. Chiều dài nguyên cây của thanh nhôm thường là 6000mm (6 mét). Các khái niệm cơ bản của bài toán được trình bày trong Bảng 2.7.

**Bảng 2.7. Các khái niệm cơ bản trong bài toán cắt phôi một chiều**

| Khái niệm | Mô tả | Giá trị áp dụng |
|------------|-------|-----------------|
| Phôi nguyên (Stock bar) | Thanh nhôm mới, chưa qua sử dụng | Thường 6000mm |
| Phôi dư (Remnant) | Đoạn nhôm còn lại sau khi cắt, nếu đủ dài có thể tái sử dụng cho đơn hàng sau | Chiều dài >= 100mm |
| Đoạn cần cắt (Demand piece) | Mỗi đoạn nhôm cần cắt theo yêu cầu BOM | Từ danh sách BOM |
| Kerf (Blade kerf) | Độ hao hụt vật liệu do lưỡi cưa tạo ra trong mỗi nhát cắt | 5mm |
| Phế liệu (Scrap) | Đoạn dư có chiều dài nhỏ hơn ngưỡng tái sử dụng, đánh dấu bỏ đi | Dưới 100mm |

### 2.7.2. Mô hình toán học

Gọi L là chiều dài của thanh phôi hiện tại, d₁, d₂, ..., dₙ là chiều dài của n đoạn cần cắt trên thanh phôi đó, và k là độ hao kerf mỗi nhát cắt.

**Tổng chiều dài sử dụng trên một thanh phôi:**

```
L_sử_dụng = (d₁ + d₂ + ... + dₙ) + n × k
```

Trong đó n là số đoạn cắt trên thanh phôi. Mỗi đoạn cần một nhát cưa để tách khỏi thanh phôi, do đó số nhát cắt bằng đúng số đoạn, tạo ra n lần hao hụt kerf.

**Phần dư sau khi cắt:**

```
L_dư = L - L_sử_dụng
```

Nếu L_dư >= 100mm, đoạn dư được lưu lại kho với trạng thái "còn dư" (CON_DU) để tái sử dụng cho các đơn hàng sau. Nếu L_dư < 100mm, đoạn dư được đánh dấu là phế liệu (BO_DI) và không lưu kho.

### 2.7.3. Thuật toán First-Fit Decreasing (FFD)

Hệ thống áp dụng thuật toán heuristic **First-Fit Decreasing (FFD)** để giải bài toán 1D-CSP. Đây là phương pháp gần đúng phổ biến, cho kết quả chấp nhận được trong thời gian tính toán ngắn. Nguyên lý hoạt động gồm hai bước chính:

**Bước 1 – Sắp xếp giảm dần:** Tất cả các đoạn cần cắt từ BOM được sắp xếp theo chiều dài giảm dần. Việc xếp đoạn dài trước giúp lấp đầy thanh phôi hiệu quả hơn, giảm khoảng trống nhỏ lẻ.

**Bước 2 – First-Fit (Đặt vào chỗ vừa đầu tiên):** Với mỗi đoạn cần cắt, hệ thống duyệt qua danh sách các thanh phôi hiện có (bao gồm cả phôi dư trong kho) và đặt đoạn đó vào thanh phôi đầu tiên còn đủ chỗ chứa, có tính đến hao hụt kerf. Nếu không có thanh phôi nào đủ chỗ, hệ thống báo lỗi thiếu phôi.

Quy trình chi tiết trong hệ thống:

1. Trích xuất danh sách đoạn cần cắt từ BOM của đơn hàng đã phân công. Chỉ lấy các chi tiết có chiều dài cắt lớn hơn 0 (nhôm thanh). Mỗi chi tiết được mở rộng theo số lượng thành các đoạn cắt riêng lẻ, sau đó sắp xếp giảm dần theo chiều dài.
2. Truy vấn kho thanh phôi theo mã vật tư tương ứng, loại bỏ phôi đã đánh dấu bỏ đi, sắp xếp giảm dần theo chiều dài hiện tại. Hệ thống ưu tiên sử dụng phôi dư trước nếu phù hợp.
3. Lấy các tham số quy tắc từ cơ sở dữ liệu: kerf = 5mm.
4. Chạy thuật toán FFD: với mỗi đoạn cần cắt, duyệt qua các thanh phôi cùng loại vật tư, kiểm tra chiều dài khả dụng có đủ chứa đoạn cắt cộng kerf hay không, và đặt vào thanh đầu tiên đủ chỗ.
5. Lưu kết quả: tạo bản ghi sơ đồ cắt cho mỗi thanh phôi được sử dụng, tạo bản ghi chi tiết cắt cho mỗi nhát cắt với thứ tự và trạng thái tương ứng.

### 2.7.4. Xử lý sau khi cắt

Khi thợ gia công xác nhận hoàn thành một sơ đồ cắt, hệ thống thực hiện các thao tác sau:

- Tính lại chiều dài phôi còn lại: lấy chiều dài trước khi cắt trừ đi tổng chiều dài các đoạn đã cắt và tổng hao hụt kerf.
- Cập nhật trạng thái thanh phôi: nếu chiều dài còn lại bằng 0 hoặc nhỏ hơn 100mm thì đánh dấu "bỏ đi" (BO_DI), ngược lại đánh dấu "còn dư" (CON_DU) để tái sử dụng.
- Ghi nhật ký gia công: lưu lại sự kiện cắt với chiều dài trước và sau, mã thợ thực hiện và mã phân công.
- Kiểm tra hoàn thành: nếu tất cả sơ đồ cắt trong cùng phân công đều đã hoàn thành, hệ thống tự động cập nhật trạng thái phân công thành "hoàn thành".

Mục tiêu của việc áp dụng thuật toán là giảm tỷ lệ hao hụt vật liệu từ mức thủ công khoảng 10–15% xuống mức thấp hơn, hướng đến dưới 5%.

---

## 2.8. Môi trường phát triển, triển khai và kiểm thử hệ thống

### 2.8.1. Tổng quan môi trường

Quá trình phát triển, triển khai và kiểm thử hệ thống sử dụng các công cụ và nền tảng được tổng hợp trong Bảng 2.8.

**Bảng 2.8. Môi trường phát triển, triển khai và kiểm thử hệ thống**

| STT | Thành phần | Công nghệ / Công cụ | Vai trò |
|:---:|-----------|---------------------|---------|
| 1 | Hệ điều hành | Windows 10/11 | Môi trường làm việc của lập trình viên |
| 2 | Trình soạn thảo | Visual Studio Code | Viết và quản lý mã nguồn |
| 3 | Quản lý mã nguồn | Git, GitHub | Lưu vết phiên bản và quản lý thay đổi |
| 4 | Môi trường chạy | Node.js, npm | Cài đặt thư viện và chạy ứng dụng |
| 5 | Frontend | Next.js, React, TypeScript | Xây dựng giao diện người dùng |
| 6 | Thiết kế giao diện | Tailwind CSS | Xây dựng giao diện responsive, Mobile-First |
| 7 | Backend | Express.js, TypeScript | Xử lý logic nghiệp vụ và API |
| 8 | Cơ sở dữ liệu | Supabase, PostgreSQL | Lưu trữ và quản lý dữ liệu trên cloud |
| 9 | Xác thực | Supabase Auth | Đăng nhập, quản lý phiên và phân quyền |
| 10 | Trình duyệt kiểm thử | Google Chrome, Microsoft Edge | Kiểm tra giao diện và chức năng |
| 11 | Thiết bị kiểm thử | Điện thoại thông minh, máy tính xách tay | Kiểm tra khả năng hiển thị đa thiết bị |
| 12 | Kết nối mạng | Wi-Fi, 4G | Đồng bộ dữ liệu giữa chủ xưởng và thợ |

### 2.8.2. Cấu hình và triển khai

Hệ thống sử dụng biến môi trường (environment variables) để cấu hình các thông số kết nối đến Supabase và backend API, đảm bảo tách biệt giữa môi trường phát triển và môi trường triển khai thực tế. Các tệp cấu hình mẫu được cung cấp sẵn trong mã nguồn để hỗ trợ quá trình thiết lập ban đầu.

### 2.8.3. Môi trường sử dụng thực tế

Môi trường sử dụng thực tế của hệ thống là xưởng gia công nhôm kính quy mô nhỏ, nơi người dùng chủ yếu thao tác bằng điện thoại thông minh. Hệ thống được thiết kế để hoạt động qua mạng nội bộ (LAN) hoặc internet, cho phép chủ xưởng truy cập từ máy tính hoặc điện thoại tại văn phòng hay công trình, và thợ gia công truy cập từ điện thoại ngay tại xưởng cắt. Dữ liệu được đồng bộ thông qua Supabase cloud, đảm bảo không bị mất khi thiết bị gặp sự cố.

Do điều kiện mạng tại xưởng có thể không ổn định, hệ thống sử dụng cơ chế bộ nhớ đệm (cache) phía client để lưu tạm dữ liệu đã tải, giúp giảm số lần gọi mạng và cải thiện trải nghiệm người dùng khi kết nối chậm hoặc gián đoạn.

---

## Tổng kết Chương 2

Chương này đã trình bày cơ sở lý thuyết và công nghệ sử dụng trong đề tài, bao gồm:

1. **Mô hình Mini-ERP** phù hợp với xưởng nhôm kính quy mô nhỏ, tập trung vào 10 nghiệp vụ cốt lõi từ quản lý khách hàng, đơn hàng đến tối ưu sản xuất.
2. **Kiến trúc Client-Server ba tầng** với frontend (Next.js), backend (Express.js) và cơ sở dữ liệu (Supabase/PostgreSQL), đảm bảo đồng bộ dữ liệu giữa nhiều người dùng.
3. **Thiết kế Mobile-First** tối ưu cho thao tác trên điện thoại trong môi trường xưởng sản xuất.
4. **Hệ sinh thái công nghệ frontend hiện đại** gồm Next.js, React, TypeScript, Tailwind CSS và các thư viện hỗ trợ chuyên biệt.
5. **Cơ sở dữ liệu quan hệ 17 bảng** với hệ thống ENUM quản lý trạng thái và phân quyền theo vai trò Admin/Worker.
6. **Lý thuyết BOM** cho phép bóc tách vật tư tự động, là cầu nối giữa khâu bán hàng và sản xuất.
7. **Bài toán 1D-CSP** với thuật toán First-Fit Decreasing, tính kerf 5mm, ưu tiên tái sử dụng phôi dư, ngưỡng phế liệu 100mm.
8. **Môi trường phát triển và kiểm thử** đầy đủ, phù hợp với điều kiện thực tế của xưởng nhôm kính.

Các nội dung lý thuyết và công nghệ trình bày trong chương này sẽ được áp dụng cụ thể vào quá trình phân tích, thiết kế và triển khai hệ thống ở các chương tiếp theo.
