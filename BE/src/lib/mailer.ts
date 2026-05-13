import nodemailer from "nodemailer";

export type SendMailResult = {
  messageId: string;
  previewUrl: string | null;
};

async function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP is not configured. Please set SMTP_USER and SMTP_PASS in BE/.env");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendAccessApprovedEmail(input: {
  to: string;
  hoTen: string;
  vaiTro: string;
  login: string;
  password: string;
}): Promise<SendMailResult> {
  const transporter = await createTransporter();

  const subject = "MiniERP - Tài khoản đã được cấp quyền";
  const html = `
    <div style="font-family: Segoe UI, Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
      <div style="background:#0b1220; color:#fff; padding:18px 22px;">
        <div style="font-weight:800; font-size:18px; letter-spacing:0.2px;">MiniERP Nhôm Kính Chí Thành</div>
        <div style="opacity:0.9; margin-top:4px;">Thông báo cấp quyền tài khoản</div>
      </div>
      <div style="padding:22px; background:#ffffff; color:#111827;">
        <p style="margin:0 0 10px 0;">Chào <b>${escapeHtml(input.hoTen)}</b>,</p>
        <p style="margin:0 0 14px 0;">Yêu cầu cấp quyền của bạn đã được duyệt. Dưới đây là thông tin đăng nhập:</p>
        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:14px 16px;">
          <div style="margin:0 0 6px 0;"><b>Vai trò</b>: ${escapeHtml(input.vaiTro)}</div>
          <div style="margin:0 0 6px 0;"><b>Email đăng nhập</b>: <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${escapeHtml(
            input.to,
          )}</span></div>
          <div style="margin:0;"><b>Mật khẩu</b>: <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${escapeHtml(
            input.password,
          )}</span></div>
        </div>
        <p style="margin:14px 0 0 0; color:#6b7280; font-size:12px;">
          Lưu ý: Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu (nếu hệ thống có hỗ trợ).
        </p>
      </div>
      <div style="background:#f3f4f6; color:#6b7280; padding:14px 22px; font-size:12px;">
        Đây là email tự động từ hệ thống. Vui lòng không trả lời email này.
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '"MiniERP NhomKinh" <no-reply@minierp.local>',
    to: input.to,
    subject,
    html,
  });

  return { messageId: String(info.messageId), previewUrl: null };
}

export async function sendQuoteEmail(input: {
  madh?: number;
  email: string;
  customer: string;
  phone?: string | null;
  doorType?: string | null;
  width?: number | null;
  height?: number | null;
  quotePrice: number;
  laborCost?: number | null;
  margin?: number | null;
  bom?: {
    sqm: number;
    phoiNhom: Array<{ code: string; name: string; length: number; qty: number }>;
    kinh: Array<{ name: string; w: number; h: number; qty: number }>;
  } | null;
}): Promise<SendMailResult> {
  const transporter = await createTransporter();

  let bomRows = "";
  const typedBom = input.bom ?? null;
  if (typedBom?.phoiNhom?.length) {
    for (const item of typedBom.phoiNhom) {
      bomRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px;">${escapeHtml(item.code)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px;">${escapeHtml(item.name)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: right;">${Number(
            item.length,
          ).toFixed(1)} mm</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: right;">${item.qty}</td>
        </tr>
      `;
    }
  }
  if (typedBom?.kinh?.length) {
    for (const item of typedBom.kinh) {
      bomRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px;">KÍNH</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px;">${escapeHtml(item.name)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: right;">${Number(
            item.w,
          ).toFixed(1)} x ${Number(item.h).toFixed(1)} mm</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: right;">${item.qty}</td>
        </tr>
      `;
    }
  }

  const orderDate = new Date().toLocaleDateString("vi-VN");
  const orderId = input.madh != null ? `DH-${input.madh}` : `DH-${Math.floor(Math.random() * 80000) + 10000}`;

  const wOpen = input.width;
  const hOpen = input.height;
  const showOpening =
    wOpen != null &&
    hOpen != null &&
    Number.isFinite(wOpen) &&
    Number.isFinite(hOpen) &&
    wOpen > 0 &&
    hOpen > 0;

  let specsExtraRows = "";
  if (showOpening) {
    specsExtraRows += `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Kích thước thông thủy:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${escapeHtml(String(wOpen))} mm (Rộng) x ${escapeHtml(
              String(hOpen),
            )} mm (Cao)</td>
          </tr>`;
  }

  const doorName =
    input.doorType === "CUA_DI_2_CANH"
      ? "Cửa Đi Mở Quay 2 Cánh (Xingfa 55)"
      : input.doorType === "CUA_SO_MO_QUAY"
        ? "Cửa Sổ Mở Quay (Xingfa 55)"
        : "Hạng mục nhôm kính";

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 8px;">
      <div style="padding: 40px 40px 20px 40px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6;">
        <div style="width: 100%;">
          <h1 style="margin: 0; color: #1e3a8a; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">MINI<span style="color: #f97316;">ERP</span></h1>
          <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Xưởng Nhôm Kính Chí Thành<br/>Đại học Nha Trang, Khánh Hòa</p>
        </div>
        <div style="text-align: right; width: 100%; float: right;">
          <h2 style="margin: 0; color: #9ca3af; font-size: 24px; font-weight: 300; letter-spacing: 2px;">HÓA ĐƠN / BÁO GIÁ</h2>
          <p style="margin: 5px 0 0 0; color: #111827; font-size: 14px; font-weight: bold;">Mã số: ${escapeHtml(orderId)}</p>
          <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">Ngày tạo: ${escapeHtml(orderDate)}</p>
        </div>
        <div style="clear: both;"></div>
      </div>

      <div style="padding: 30px 40px; background: #f9fafb;">
        <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Kính gửi khách hàng:</h3>
        <p style="margin: 0 0 5px 0; color: #111827; font-size: 18px; font-weight: bold;">${escapeHtml(input.customer)}</p>
        <p style="margin: 0 0 5px 0; color: #4b5563; font-size: 14px;">Số điện thoại: ${escapeHtml(input.phone || "Chưa cung cấp")}</p>
        <p style="margin: 0; color: #4b5563; font-size: 14px;">Email: ${escapeHtml(input.email)}</p>
      </div>

      <div style="padding: 30px 40px 10px 40px;">
        <h3 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">THÔNG SỐ KỸ THUẬT & HẠNG MỤC</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">Loại cửa thiết kế:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${escapeHtml(doorName)}</td>
          </tr>${specsExtraRows}
        </table>
      </div>

      <div style="padding: 20px 40px;">
        <h3 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">CHI TIẾT BÓC TÁCH VẬT TƯ (BOM)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: left; color: #4b5563; font-size: 12px; font-weight: bold; border-radius: 6px 0 0 6px;">Mã VT</th>
              <th style="padding: 10px; text-align: left; color: #4b5563; font-size: 12px; font-weight: bold;">Tên Vật Tư</th>
              <th style="padding: 10px; text-align: right; color: #4b5563; font-size: 12px; font-weight: bold;">Kích Thước</th>
              <th style="padding: 10px; text-align: right; color: #4b5563; font-size: 12px; font-weight: bold; border-radius: 0 6px 6px 0;">Số Lượng</th>
            </tr>
          </thead>
          <tbody>
            ${bomRows || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #9ca3af; font-style: italic;">Chưa có dữ liệu bóc tách</td></tr>'}
          </tbody>
        </table>
      </div>

      <div style="padding: 20px 40px; border-top: 2px dashed #e5e7eb; margin-top: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 15px 0 5px 0; text-align: right; color: #111827; font-size: 16px; font-weight: bold; text-transform: uppercase;">TỔNG TIỀN THANH TOÁN:</td>
            <td style="padding: 15px 0 5px 0; text-align: right; color: #ea580c; font-size: 24px; font-weight: 900;">${escapeHtml(
              input.quotePrice.toLocaleString("vi-VN"),
            )} VNĐ</td>
          </tr>
        </table>
      </div>

      <div style="padding: 30px 40px; background: #1e3a8a; color: #fff; text-align: center; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Cảm ơn quý khách đã tin tưởng!</p>
        <p style="margin: 0; color: #93c5fd; font-size: 13px; line-height: 1.5;">
          Đây là email tự động từ hệ thống quản trị sản xuất MiniERP.<br/>
          Vui lòng liên hệ lại quản đốc xưởng để xác nhận bản vẽ thi công.
        </p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '"MiniERP NhomKinh" <no-reply@minierp.local>',
    to: input.email,
    subject: `Báo Giá Đơn Hàng - ${input.customer}`,
    html,
  });

  return { messageId: String(info.messageId), previewUrl: null };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

