# TÀI LIỆU ĐẶC TẢ: KIẾN TRÚC CÔNG NGHỆ VÀ NGHIỆP VỤ LÕI CỦA HỆ THỐNG MINI-ERP NHÔM KÍNH

*Tài liệu này trình bày chính xác hệ thống kiến trúc công nghệ và thực tiễn kỹ thuật đã được áp dụng trong quá trình phát triển ứng dụng Mini-ERP ngành nhôm kính, dựa trên cấu trúc mô-đun và thuật toán đã được triển khai.*

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Mini-ERP được thiết kế dưới dạng Web Application (Ứng dụng Web) tập trung giải quyết bài toán quản trị sản xuất đặc thù của xưởng nhôm kính: Báo giá, Bóc tách vật tư (BOM) và Tối ưu cắt phôi.
Hệ thống sử dụng mô hình kiến trúc phân tách rõ ràng giữa giao diện người dùng (Client-Side ứng dụng Next.js) và cơ sở dữ liệu đám mây trực tiếp (Backend-as-a-Service qua Supabase).

---

## 2. LỚP GIAO DIỆN (FRONTEND & CHỈ THỊ UI/UX)

Hệ thống thiết kế giao diện được chuẩn hóa bằng các công nghệ hiện đại nhất áp dụng cho hệ sinh thái React:

*   **Next.js (App Router):** Được cấu hình làm nền tảng lõi. Phân tách rõ các không gian giao diện như Hệ thống Quản trị (`/admin/layout.tsx`) và Không gian cho Thợ (`/worker`). Sử dụng lợi thế kiến trúc SSR/CSR của Next.js để tải báo cáo mượt mà.
*   **TypeScript:** Đóng vai trò kiểm soát an toàn kiểu dữ liệu. Tất cả các tham biến sản xuất (như cấu hình lề cắt, thông số DOWES, định dạng vật tư) đều được ánh xạ qua các `interface` giúp lập trình chính xác và loại bỏ các lỗi sai sót dữ liệu khi vận hành bảng tính giá.
*   **Tailwind CSS:** Quản lý toàn bộ hệ thống lưới (Grid/Flex) và thiết kế đáp ứng (Responsive). Các yếu tố UI như Dark Mode, hiệu ứng Glassmorphism (Kính mờ) ở thanh header áp trần, Hover Glow ở các thẻ (Cards) được mã hóa bằng CSS tiện ích (Utility-classes).
*   **Triết lý Mobile-First cho Phân xưởng:** Giao diện Thợ được tối ưu hóa đặc biệt. Sử dụng Bottom Navigation Bar (Thanh điều hướng dưới đáy màn hình) và các kích thước Nút bấm khuếch đại (như thẻ Quét Mã QR) bảo đảm thợ thao tác bằng ngón cái ngay cả khi đeo găng tay lao động.
*   **Recharts & Lucide-React:** Sử dụng thư viện gốc SVG `recharts` để minh họa Biểu đồ Doanh thu (Line chart) và Thống kê hao hụt vật tư (Bar chart). Hệ thống biểu tượng giao diện sử dụng trọn bộ `lucide-react`.

---

## 3. LỚP CƠ SỞ DỮ LIỆU VÀ MÔI TRƯỜNG BACKEND

*   **Hệ quản trị CSDL Supabase (PostgreSQL):** Bố trí làm khu vực lưu trữ trung tâm thay cho máy chủ tự Host. Quản lý hệ thống bảng dữ liệu chặt chẽ (gồm: `danh_muc`, `vat_tu`, `quy_tac_san_xuat`).
*   **Kết nối truy xuất trực tiếp:** Frontend giao tiếp dữ liệu thông qua thư viện Supabase Client V2 (VD: `supabase.from('vat_tu').select()`), thay thế các endpoint API trung gian rườm rà.
*   **Mô-đun Seeding Dữ Liệu (Live DB Migration):** Để nạp được hệ thống thông số đặc tả khổng lồ (bóc tách từ phần mềm DOWES/ANV), dự án xây dựng kịch bản Node.js (ví dụ tệp `seed.ts`). Kịch bản này sử dụng quyền Quản trị cao nhất (Service Role Key) để chuyển dịch tập lệnh JSON tĩnh bên trong mã nguồn (`dowes-config.ts`) và chèn (INSERT) hàng loạt lên CSDL Supabase, khởi tạo dữ liệu vận hành.

---

## 4. TỔ HỢP THUẬT TOÁN NGHIỆP VỤ VÀ GIAO THỨC LÕI

Dự án không dừng lại ở nhập xuất văn bản rời rạc, mà xây dựng các tính toán tham chiếu trực tiếp từ chuyên môn mộc/nhôm.

### 4.1. Hệ thống Bóc Tách Tự Động (Auto-BOM) và Tính Giá
Kế thừa triết lý từ hệ thống ANV và DOWES, phần mềm cung cấp công cụ nội suy:
*   Người dùng nhập chỉ số Rộng - Cao phủ bì.
*   Hệ thống gọi biến cấu trúc của hệ nhôm (VD: Xingfa 55) từ Database, áp dụng công thức ngậm kính, lề biên (Ví dụ: `(W-87)/2`) để tự động nội suy kính lọt lòng và chiều dài 4 thanh cắt. Tính năng tự cộng dồn tiền mua nhôm thô, tiền công và biên độ lợi nhuận để sinh "Giá Bán Đề Xuất".

### 4.2. Khung Thuật Toán 1D-CSP và Giao diện Visualizer
Giải quyết bài toán Cắt phôi 1 chiều (1-Dimensional Cutting Stock Problem):
*   Tính toán chia các đoạn cánh yêu cầu để xếp lọt vào thanh nhôm gốc $6.0\text{m}$.
*   Thuật toán sẽ tự động trừ đi hao hụt lõi (Lề cắt / Kerf Blade - $4\text{m}\text{m}$ cho mỗi nhát dao).
*   Kết xuất giao diện tại `/admin/toi-uu-cat` không hiển thị con số khô khan mà vẽ trực tiếp **Đồ họa Cắn phôi (Visualizer Thước cắt)**: Mô phỏng hình ảnh thước kẻ phân khúc màu sắc đoạn cắt, đoạn mùn cưa và đoạn khởi nguyên gọt mép. Thợ máy chỉ cần nhìn biểu đồ màu hiển thị tỷ lệ (%) phôi hao hụt để thao tác ngay trên mâm cắt.

### 4.3. Kiến trúc Quản lý Tồn kho Định danh (UID)
*   **Đo lường cá thể:** Khước từ quy trình cộng dồn tổng số Mét nhôm trong kho.
*   Kho phôi sử dụng phương pháp gán Mã định danh duy nhất (UID / Mã vạch) cho từng thanh nhôm, bất kể là cây nguyên hay cây Đề-xê (khúc nhôm dư). Hệ thống đảm bảo tính Track-and-Trace chính xác cho từng nhát cắt phế, biết rõ thanh nguyên liệu gốc nào đã bị cắt dài bao nhiêu, đoạn dư hiện đang nằm vị trí nào trong nhà xưởng.

### 4.4. Cấu trúc Nạp Lệnh Máy CNC (CSV Export)
Cung cấp tiện ích chuyển đổi mảng dữ liệu lệnh cắt thành định dạng tệp CSV. Chức năng cấp tùy chọn "Tải File" để người dùng mang dữ liệu qua thiết bị cổng USB nạp lệnh (Load Commands) trực tiếp cho các màn hình PLC của máy cắt nhôm nội suy 2 đầu, giảm tải hoàn toàn khâu gõ thủ công trên máy công cụ cứng.
