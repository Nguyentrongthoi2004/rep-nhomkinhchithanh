# Kế Hoạch Tiếp Tục: Mini-ERP Nhôm Kính (Đợt A)

Theo yêu cầu, dưới đây là báo cáo hiện trạng và kế hoạch tiếp tục tập trung vào Đợt A (Chốt Backend Đợt 4 Proposal/RPC).

## 1. Git status / tình trạng repo
- **File đang thay đổi**:
  - **Backend**: `app.ts`, `env.ts`, `index.ts`
  - **Modules**: `cutting-plans`, `images`, `raw-stock`
  - **Frontend**: Hàng loạt file trong `FE/src/app` (`admin`, `worker`), `next.config.ts`, `package.json`, `api.ts`, `image-upload.ts`.
  - **Migrations**: `13_image_workflow.sql`, `14_proposals_and_rules_DEPRECATED_DO_NOT_RUN.sql`, `15_cutting_proposal_approve_rpc.sql`.
  - **Documents**: `algorithm_score_v1.1.md`, `bao_cao_chuyen_de_2.md`.
- **File liên quan Đợt 4**: `cutting-plans.service.ts`, `cutting-plans.routes.ts`, `cutting-plans.schema.ts`, `routes/index.ts`, `15_cutting_proposal_approve_rpc.sql`.
- **Dấu hiệu code chưa hoàn chỉnh**: Backend đã có code đầy đủ cho Đợt 4. Tuy nhiên, repo hiện tại đang **không sạch** vì AI trước đã làm lấn sang các Đợt B (FE) và C (Image). Điều này vi phạm nguyên tắc "Không làm nhiều đợt cùng lúc nếu chưa build/test xong đợt hiện tại".

## 2. Hiện trạng Backend Đợt 4
- **`submitProposal`**: Đã hoàn thiện. Tự tính toán điểm, metrics, độ dài, kerf. Đã chặn phôi lỗi (`CHO_XU_LY`), chặn phôi `BO_DI`, validate BOM chính xác (`mactdh`, `soluong`, `mavt`). Tính chiều dài trừ `SAFE_MARGIN * 2`. Không ghi đè kho/sơ đồ thật, chỉ lưu vào bảng `dexuatcat`. Không tin tưởng thông số client.
- **`approveProposal`**: Đã gọi thẳng RPC `approve_cutting_proposal` trong Supabase. Không còn logic hard replace trong TypeScript. Đã xử lý mapping lỗi RPC (P0002 -> 404, 42501 -> 403, EXPIRED/INVALID_STATE -> 409).
- **`rejectProposal`**: Đã gọi thẳng RPC `reject_cutting_proposal`.
- **`listProposals/getProposalDetail`**: Đã tồn tại, lấy dữ liệu từ `dexuatcat` và `chitietdexuatcat`.
- **Route hiện trạng**:
  - Đã **giữ** route cũ: `/api/admin/cutting-plans/proposals` và `/api/worker/cutting-plans/proposals`.
  - Đã **thêm** route chuẩn mới: `/api/admin/cutting-proposals/*` và `/api/worker/cutting-proposals/*` với đầy đủ các method HTTP.

## 3. Các vấn đề còn lại
- **Đã ổn**: Logic Backend Proposal/RPC Đợt 4 đã được setup rất đầy đủ và an toàn.
- **Cần sửa**: Cần test lint và build Backend.
- **Nguy hiểm cần xử lý ngay**: Các file FE, images đang bị thay đổi tràn lan bởi AI trước. Có thể gây lỗi compile cho FE hoặc mâu thuẫn hệ thống.
- **Cần tôi quyết định**: Bạn có muốn **revert (xóa bỏ)** các file Frontend và Images đang modified để làm sạch repo và tập trung test thuần Backend Đợt A trước không? Hay cứ để đó và chỉ làm Đợt A?

## 4. Plan code tiếp theo
- **File sẽ sửa**: Tạm thời không sửa mã nguồn BE nào nếu không có lỗi lint/build.
- **Hàm sẽ sửa**: Không có.
- **Route sẽ thêm/giữ**: Giữ nguyên toàn bộ các route đã thiết lập.
- **Test sẽ chạy**:
  1. `cd BE && npm run lint`
  2. `cd BE && npm run build`
  3. Lập một số test request (POST) trực tiếp vào API `submitProposal`, `approveProposal` để verify data.
- **Không làm gì**: Không code FE, không code Upload Ảnh, không Polish UI Kho phôi, không sửa Dashboard cho đến khi Đợt A (Backend RPC) hoàn toàn xanh (pass).

## 5. Kiểm thử đề xuất
- **Test RPC**: Gọi thử RPC trên Supabase (trực tiếp hoặc qua API) để check các case P0002.
- **Test service**: Chạy lint/build bắt buộc.
- **Test route**: Dùng Insomnia/Postman/cURL hoặc script gửi payload test tới API `POST /api/worker/cutting-proposals`.
- **Lint/build**: Chạy `npm run lint` và `npm run build` ở backend.

## 6. Rủi ro còn lại
- **Rủi ro dữ liệu**: Rất thấp, do sử dụng RPC Transaction cho hard replace.
- **Rủi ro route/FE**: FE đang lộn xộn do AI trước code, có thể gọi sai route nếu test end-to-end.
- **Rủi ro RPC**: Validate ở RPC có logic kiểm tra `chieudaihientai - SAFE_MARGIN * 2`. Nếu FE và BE dùng quy tắc khác nhau có thể gặp lỗi `EXPIRED` oan.
- **Rủi ro validate**: Không đáng kể.

## 7. Kết luận
- **Có nên code tiếp không?**: Không code tính năng mới.
- **Nếu có, code phạm vi nào?**: Chỉ chạy Test / Lints / Build cho Backend (Đợt A).
- **Cần bạn quyết định**: Hãy cho phép tôi chạy lệnh Lint/Build, đồng thời quyết định xem có nên gỡ bỏ (revert) các file FE không để trả repo về trạng thái sạch.
