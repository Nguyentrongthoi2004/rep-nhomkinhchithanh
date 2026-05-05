import nodemailer from "nodemailer";

export type SendMailResult = {
  messageId: string;
  previewUrl: string | null;
};

function hasRealSmtp(): boolean {
  return Boolean(process.env.SMTP_PASS && process.env.SMTP_USER);
}

async function createTransporter() {
  if (hasRealSmtp()) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
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
    from: process.env.SMTP_FROM || '"MiniERP NhomKinh" <no-reply@minierp.local>',
    to: input.to,
    subject,
    html,
  });

  const previewUrl = hasRealSmtp() ? null : (nodemailer.getTestMessageUrl(info) || null);
  return { messageId: String(info.messageId), previewUrl };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

