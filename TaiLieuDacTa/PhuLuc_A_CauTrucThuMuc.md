# PHỤ LỤC

## PHỤ LỤC A. CẤU TRÚC THƯ MỤC DỰ ÁN

### A.1. Mô tả tổng quan

Mã nguồn hệ thống Mini-ERP được tổ chức thành ba nhóm chính: **FE** (Frontend), **BE** (Backend) và **supabase_scripts** (SQL Scripts). Thư mục FE chứa toàn bộ mã nguồn giao diện người dùng được xây dựng bằng Next.js, bao gồm các trang theo vai trò Admin và Worker, các component tái sử dụng, thư viện tiện ích và cấu hình kết nối. Thư mục BE chứa mã nguồn xử lý logic nghiệp vụ phía server được xây dựng bằng Express.js, bao gồm 17 module nghiệp vụ, middleware xác thực – phân quyền và cấu hình hệ thống.

Thư mục supabase_scripts chứa các tệp SQL định nghĩa lược đồ cơ sở dữ liệu PostgreSQL trên Supabase, bao gồm tạo bảng, kiểu ENUM, chỉ mục, dữ liệu mẫu và tài khoản quản trị ban đầu. Ngoài ra, dự án còn có thư mục TaiLieuDacTa chứa các tài liệu đặc tả kỹ thuật phục vụ quá trình phát triển và báo cáo.

### A.2. Cây thư mục rút gọn

```
MiniERP_NhomKinh/
├── FE/                                    # Frontend – Next.js
│   ├── src/
│   │   ├── app/                           # App Router (định tuyến theo thư mục)
│   │   │   ├── admin/                     # Các trang dành cho Admin
│   │   │   │   ├── don-hang/              #   Quản lý đơn hàng
│   │   │   │   ├── khach-hang/            #   Quản lý khách hàng
│   │   │   │   ├── vat-tu/                #   Quản lý vật tư
│   │   │   │   ├── danh-muc/              #   Quản lý danh mục
│   │   │   │   ├── kho-phoi/              #   Quản lý kho phôi
│   │   │   │   ├── kho/                   #   Quản lý nhập kho
│   │   │   │   ├── toi-uu-cat/            #   Tối ưu cắt phôi
│   │   │   │   ├── phan-cong/             #   Phân công thợ gia công
│   │   │   │   ├── san-xuat/              #   Theo dõi sản xuất
│   │   │   │   ├── thanh-toan/            #   Quản lý thanh toán, công nợ
│   │   │   │   ├── nhan-su/               #   Quản lý nhân sự
│   │   │   │   ├── cau-hinh/              #   Cấu hình hệ thống
│   │   │   │   └── yeu-cau-cap-quyen/     #   Duyệt yêu cầu cấp quyền
│   │   │   ├── worker/                    # Các trang dành cho Worker
│   │   │   │   ├── tasks/                 #   Danh sách nhiệm vụ
│   │   │   │   ├── cat/                   #   Máy cắt (sơ đồ cắt)
│   │   │   │   ├── kho/                   #   Xem kho phôi
│   │   │   │   ├── calendar/              #   Lịch công việc
│   │   │   │   ├── simulator/             #   Mô phỏng cắt
│   │   │   │   └── ca-nhan/               #   Thông tin cá nhân
│   │   │   ├── login/                     # Trang đăng nhập
│   │   │   ├── api/                       # API Routes (proxy chuyển tiếp)
│   │   │   │   ├── admin/                 #   API proxy cho Admin
│   │   │   │   ├── worker/                #   API proxy cho Worker
│   │   │   │   ├── auth/                  #   API xác thực
│   │   │   │   ├── bom/                   #   API bóc tách vật tư
│   │   │   │   └── optimize/              #   API tối ưu cắt
│   │   │   ├── layout.tsx                 # Layout gốc của ứng dụng
│   │   │   └── globals.css                # Stylesheet toàn cục
│   │   ├── components/                    # Component tái sử dụng
│   │   │   └── layout/                    #   Layout chung (Header, Sidebar, BottomNav)
│   │   ├── lib/                           # Thư viện tiện ích
│   │   │   ├── supabase/                  #   Cấu hình Supabase Client
│   │   │   ├── data/                      #   Dữ liệu cấu hình cửa
│   │   │   ├── api.ts                     #   Hàm gọi API dùng chung
│   │   │   └── order-status.ts            #   Xử lý trạng thái đơn hàng
│   │   ├── store/                         # Quản lý trạng thái (Zustand)
│   │   ├── hooks/                         # Custom React Hooks
│   │   ├── types/                         # Định nghĩa kiểu TypeScript
│   │   └── middleware.ts                  # Middleware xác thực, phân quyền
│   ├── public/                            # Tài nguyên tĩnh (favicon, hình ảnh)
│   ├── package.json                       # Khai báo thư viện Frontend
│   ├── tsconfig.json                      # Cấu hình TypeScript
│   ├── next.config.ts                     # Cấu hình Next.js
│   └── .env.example                       # Tệp cấu hình mẫu biến môi trường
│
├── BE/                                    # Backend – Express.js
│   ├── src/
│   │   ├── modules/                       # 17 module nghiệp vụ
│   │   │   ├── orders/                    #   Đơn hàng
│   │   │   ├── customers/                 #   Khách hàng
│   │   │   ├── materials/                 #   Vật tư
│   │   │   ├── categories/                #   Danh mục
│   │   │   ├── raw-stock/                 #   Kho thanh phôi
│   │   │   ├── cutting-plans/             #   Sơ đồ cắt và thuật toán 1D-CSP
│   │   │   ├── assignments/               #   Phân công thợ gia công
│   │   │   ├── payments/                  #   Giao dịch tài chính
│   │   │   ├── notifications/             #   Thông báo hệ thống
│   │   │   ├── users/                     #   Người dùng
│   │   │   ├── auth/                      #   Xác thực đăng nhập
│   │   │   ├── access-requests/           #   Yêu cầu cấp quyền
│   │   │   ├── emails/                    #   Gửi email
│   │   │   ├── rules/                     #   Quy tắc hệ thống
│   │   │   ├── worker-tasks/              #   Nhiệm vụ của thợ
│   │   │   ├── health/                    #   Kiểm tra trạng thái server
│   │   │   └── bootstrap/                 #   Khởi tạo dữ liệu ban đầu
│   │   ├── middlewares/                   # Middleware
│   │   │   ├── auth.ts                    #   Xác thực token
│   │   │   ├── rbac.ts                    #   Phân quyền theo vai trò
│   │   │   ├── validate.ts                #   Kiểm tra dữ liệu đầu vào
│   │   │   ├── error.ts                   #   Xử lý lỗi tập trung
│   │   │   └── requestContext.ts          #   Ngữ cảnh request
│   │   ├── routes/                        # Đăng ký tất cả route
│   │   │   └── index.ts
│   │   ├── config/                        # Cấu hình biến môi trường
│   │   │   └── env.ts
│   │   ├── lib/                           # Thư viện dùng chung
│   │   │   ├── supabase.ts                #   Supabase Admin Client
│   │   │   ├── mailer.ts                  #   Gửi email qua SMTP
│   │   │   ├── http.ts                    #   Lớp lỗi HTTP chuẩn
│   │   │   ├── logger.ts                  #   Ghi log hệ thống
│   │   │   └── asyncHandler.ts            #   Xử lý bất đồng bộ
│   │   ├── types/                         # Định nghĩa kiểu TypeScript
│   │   ├── app.ts                         # Khởi tạo Express Application
│   │   └── server.ts                      # Điểm khởi chạy server
│   ├── package.json                       # Khai báo thư viện Backend
│   ├── tsconfig.json                      # Cấu hình TypeScript
│   └── .env.example                       # Tệp cấu hình mẫu biến môi trường
│
├── supabase_scripts/                      # SQL Scripts – Cơ sở dữ liệu
    ├── 01_schema_final.sql                # Định nghĩa bảng, ENUM, chỉ mục, RLS
    ├── 02_seed_complete.sql               # Dữ liệu mẫu ban đầu
    ├── 03–05_*.sql                        # Các script bổ sung (cấp quyền, thông báo)
    └── mini_erp_schema.dbml               # Mô hình dữ liệu dạng DBML

```

### A.3. Giải thích vai trò các thư mục chính

**Bảng A.1. Vai trò các thành phần trong cấu trúc thư mục dự án**

| STT | Thành phần           | Vai trò                                                                                                                                                                            |
| :-: | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1  | FE/                  | Thư mục gốc của ứng dụng Frontend, xây dựng bằng Next.js với TypeScript. Chứa toàn bộ mã nguồn giao diện người dùng.                                                               |
|  2  | FE/src/app/          | Các trang giao diện theo cơ chế App Router của Next.js. Mỗi thư mục con tương ứng với một đường dẫn URL trên trình duyệt.                                                          |
|  3  | FE/src/app/admin/    | Nhóm 13 trang dành cho vai trò Admin (chủ xưởng): quản lý đơn hàng, khách hàng, vật tư, kho phôi, tối ưu cắt, phân công, thanh toán, nhân sự, cấu hình và duyệt yêu cầu cấp quyền. |
|  4  | FE/src/app/worker/   | Nhóm 6 trang dành cho vai trò Worker (thợ gia công): xem nhiệm vụ, sơ đồ cắt, kho phôi, lịch công việc, mô phỏng cắt và thông tin cá nhân.                                         |
|  5  | FE/src/app/api/      | API Routes đóng vai trò proxy chuyển tiếp yêu cầu từ trình duyệt đến Backend Express.js, giúp tránh vấn đề CORS.                                                                   |
|  6  | FE/src/components/   | Các component giao diện tái sử dụng, bao gồm layout chung (Header, Sidebar, BottomNav) cho cả hai vai trò Admin và Worker.                                                         |
|  7  | FE/src/lib/          | Thư viện tiện ích dùng chung: cấu hình Supabase Client, hàm gọi API, xử lý trạng thái đơn hàng và dữ liệu cấu hình cửa.                                                            |
|  8  | FE/src/store/        | Quản lý trạng thái phía client bằng Zustand, lưu trữ các dữ liệu dùng chung giữa nhiều trang.                                                                                      |
|  9  | FE/src/middleware.ts | Middleware kiểm tra phiên đăng nhập qua Supabase Auth và phân quyền truy cập giữa Admin và Worker trước khi cho phép vào trang.                                                    |
| 10  | BE/                  | Thư mục gốc của ứng dụng Backend, xây dựng bằng Express.js với TypeScript. Xử lý logic nghiệp vụ, xác thực và truy vấn cơ sở dữ liệu.                                              |
| 11  | BE/src/modules/      | 17 module nghiệp vụ, mỗi module chứa các tệp xử lý route, service và schema riêng biệt (ví dụ: orders, customers, cutting-plans).                                                  |
| 12  | BE/src/middlewares/  | Các middleware xử lý xác thực token, phân quyền theo vai trò (RBAC), kiểm tra dữ liệu đầu vào và xử lý lỗi tập trung.                                                              |
| 13  | BE/src/routes/       | Tệp đăng ký tập trung tất cả route từ 17 module, ánh xạ đường dẫn URL đến hàm xử lý tương ứng.                                                                                     |
| 14  | BE/src/lib/          | Thư viện dùng chung: Supabase Admin Client, gửi email SMTP, lớp lỗi HTTP chuẩn hóa và ghi log hệ thống.                                                                            |
| 15  | BE/src/config/       | Cấu hình đọc và kiểm tra biến môi trường (environment variables) khi khởi động server.                                                                                             |
| 16  | supabase_scripts/    | Các tệp SQL định nghĩa lược đồ cơ sở dữ liệu PostgreSQL trên Supabase, bao gồm tạo bảng, kiểu ENUM, chỉ mục, chính sách bảo mật RLS, dữ liệu mẫu và tài khoản quản trị ban đầu.    |
| 17  | package.json         | Tệp khai báo các thư viện phụ thuộc và lệnh chạy ứng dụng, có ở cả FE và BE.                                                                                                       |
| 18  | .env.example         | Tệp cấu hình mẫu biến môi trường, hướng dẫn các biến cần thiết mà không chứa giá trị nhạy cảm.                                                                                     |
