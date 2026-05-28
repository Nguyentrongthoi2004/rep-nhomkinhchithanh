---
trigger: manual
description: MiniERP domain context, stack, business flows, safety invariants, and testing expectations.
---

# MiniERP Project Context

## Project Overview
- Mini-ERP Nhôm Kính Chí Thành là hệ thống quản lý sản xuất, tối ưu hóa sơ đồ cắt nhôm kính và theo dõi thi công công trình dành cho nhà xưởng.

## Stack
- **Frontend (FE)**: Next.js, React, Zustand, React Query, TailwindCSS (v4).
- **Backend (BE)**: Express.js, TypeScript, Supabase Client.
- **Database (DB)**: Supabase PostgreSQL, Row-Level Security (RLS) enabled.
- **Storage**: Supabase Storage lưu trữ hình ảnh công trình.

## Roles
- **ADMIN**: Quản đốc xưởng, quản lý đơn hàng, vật tư, phân công thợ, duyệt sơ đồ tối ưu cắt và xử lý báo cáo lỗi.
- **WORKER**: Thợ thi công, xem nhiệm vụ được giao, báo cáo tiến độ, upload hình ảnh thực tế, đề xuất thay đổi sơ đồ cắt nếu phát sinh lỗi phôi.

## Core Business Flows
- **Order & BOM**: Tạo đơn hàng -> Lập bảng vật tư (BOM) -> Gửi báo giá -> Duyệt giá (`DA_DUYET_GIA`).
- **Assignment**: Phân công đơn hàng đã duyệt giá cho Worker.
- **Cutting Plan**: Tự động tính toán sơ đồ cắt nhôm tối ưu (Heuristic 1D-CSP) cho phân công.
- **Worker Photo/Completion**: Worker thi công, tải ảnh thực tế (`CAT_PHOI`), bấm hoàn thành từng sơ đồ cắt, tải ảnh tổng thể (`HOAN_THANH_CONG_TRINH`) để hoàn thành phân công.
- **Proposal Flow**: Worker báo lỗi phôi, đề xuất sơ đồ cắt thay thế (Proposal) -> Admin xem xét Duyệt/Từ chối qua RPC.
- **Image Storage**: Lưu trữ hình ảnh thực tế thông qua Supabase Storage Signed URLs.

## Critical Invariants
- **Không tự ý trừ kho**: Việc tạo sơ đồ cắt (`sodocat`) tuyệt đối không làm giảm số lượng hay chiều dài phôi trong kho.
- **Trừ kho đúng thời điểm**: Chỉ trừ chiều dài phôi và cập nhật trạng thái kho (`khothanhphoi`) trong luồng hoàn thành sơ đồ cắt (`completePlan`) của Worker hoặc khi Admin xử lý sự cố (`trimIssue`).
- **Phân quyền Backend**: Backend lấy thông tin định danh và vai trò trực tiếp từ Auth token/session của Supabase, không tin tưởng/body parameters gửi từ client.
- **Worker không sửa trực tiếp**: Worker không được phép sửa đổi sơ đồ cắt chính thức, chỉ được tạo đề xuất thay đổi (`proposal`).

## Sensitive Files and Flows
- **Migration 15**: Schema và logic nghiệp vụ lõi; không chỉnh sửa nếu chưa được user duyệt riêng.
- **RPC `approve_cutting_proposal` / `reject_cutting_proposal`**: Xử lý phê duyệt/từ chối đề xuất cắt.
- **completePlan flow**: Tác vụ hoàn thành thi công và trừ kho phôi thực tế.
- **Supabase Auth**: Các khóa dịch vụ (Service role key), cấu hình JWT và mật khẩu kiểm thử.

## Testing Expectations
- **Readonly/Smoke**: Chỉ kiểm tra endpoint GET hoặc các case RBAC 401/403, cấm thay đổi dữ liệu thật.
- **Manual UI**: Kiểm chứng giao diện trên browser thật, đảm bảo không kẹt loading hay crash Next.js.
- **Mutating Smoke**: Kiểm thử luồng ghi với tiền tố `TEST_E2E`, bắt buộc khôi phục trạng thái `ALLOW_MUTATION_TESTS=false` sau khi test xong.

## Context Budget Rule
- Chỉ đọc các file trực tiếp liên quan đến yêu cầu. Tránh quét toàn bộ repo và phân tích lan man để tối ưu chi phí token.
