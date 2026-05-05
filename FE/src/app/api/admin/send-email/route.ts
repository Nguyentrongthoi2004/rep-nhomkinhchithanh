import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type BomPhoiNhomItem = {
  code: string;
  name: string;
  length: number;
  qty: number;
};

type BomKinhItem = {
  name: string;
  w: number;
  h: number;
  qty: number;
};

type BomPayload = {
  sqm: number;
  phoiNhom: BomPhoiNhomItem[];
  kinh: BomKinhItem[];
};

export async function POST(req: Request) {
  try {
    const { email, customer, doorType, width, height, quotePrice, bom, phone, laborCost, margin } = await req.json();

    if (!email || !customer) {
      return NextResponse.json({ error: "Thiếu thông tin người nhận" }, { status: 400 });
    }

    // Nếu bạn có mật khẩu ứng dụng Gmail (App Password), hãy điền vào .env.local:
    // SMTP_USER=nhomkinhchithanh2026@gmail.com
    // SMTP_PASS=mật_khẩu_ứng_dụng
    const isRealSMTP = !!process.env.SMTP_PASS;

    let transporter;
    if (isRealSMTP) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Dùng máy chủ Ethereal giả lập để test nếu chưa cài Mật khẩu ứng dụng Gmail
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    // Tạo các dòng BOM
    let bomRows = "";
    const typedBom = bom as BomPayload | undefined;
    if (typedBom?.phoiNhom?.length && typedBom?.kinh?.length) {
      typedBom.phoiNhom.forEach((item) => {
        bomRows += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px;">${item.code}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: right;">${item.length.toFixed(1)} mm</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: right;">${item.qty}</td>
          </tr>
        `;
      });
      typedBom.kinh.forEach((item) => {
        bomRows += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px;">KINH-8MM</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: right;">${item.w.toFixed(1)} x ${item.h.toFixed(1)} mm</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 13px; text-align: right;">${item.qty}</td>
          </tr>
        `;
      });
    }

    const orderDate = new Date().toLocaleDateString('vi-VN');
    const orderId = `DH-${Math.floor(Math.random() * 80000) + 10000}`;

    // HTML Email Template - Professional Invoice
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-w: 700px; margin: 0 auto; background: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 8px;">
        
        <!-- Header -->
        <div style="padding: 40px 40px 20px 40px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6;">
          <div style="width: 100%;">
            <h1 style="margin: 0; color: #1e3a8a; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">MINI<span style="color: #f97316;">ERP</span></h1>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Xưởng Nhôm Kính Chí Thành<br/>Đại học Nha Trang, Khánh Hòa</p>
          </div>
          <div style="text-align: right; width: 100%; float: right;">
            <h2 style="margin: 0; color: #9ca3af; font-size: 24px; font-weight: 300; letter-spacing: 2px;">HÓA ĐƠN / BÁO GIÁ</h2>
            <p style="margin: 5px 0 0 0; color: #111827; font-size: 14px; font-weight: bold;">Mã số: ${orderId}</p>
            <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">Ngày tạo: ${orderDate}</p>
          </div>
          <div style="clear: both;"></div>
        </div>
        
        <!-- Bill To -->
        <div style="padding: 30px 40px; background: #f9fafb;">
          <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Kính gửi khách hàng:</h3>
          <p style="margin: 0 0 5px 0; color: #111827; font-size: 18px; font-weight: bold;">${customer}</p>
          <p style="margin: 0 0 5px 0; color: #4b5563; font-size: 14px;">Số điện thoại: ${phone || 'Chưa cung cấp'}</p>
          <p style="margin: 0; color: #4b5563; font-size: 14px;">Email: ${email}</p>
        </div>

        <!-- Specifications -->
        <div style="padding: 30px 40px 10px 40px;">
          <h3 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">THÔNG SỐ KỸ THUẬT & HẠNG MỤC</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">Loại cửa thiết kế:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${doorType === "CUA_DI_2_CANH" ? "Cửa Đi Mở Quay 2 Cánh (Xingfa 55)" : "Cửa Sổ Mở Quay (Xingfa 55)"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Kích thước thông thủy:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${width} mm (Rộng) x ${height} mm (Cao)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tổng diện tích thi công:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${bom ? bom.sqm.toFixed(2) : 0} m²</td>
            </tr>
          </table>
        </div>

        <!-- BOM Table -->
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

        <!-- Total Price -->
        <div style="padding: 20px 40px; border-top: 2px dashed #e5e7eb; margin-top: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; text-align: right; color: #6b7280; font-size: 14px; width: 70%;">Phí gia công nhân công:</td>
              <td style="padding: 5px 0; text-align: right; color: #111827; font-size: 14px;">${laborCost ? laborCost.toLocaleString('vi-VN') : 0} đ/m²</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; text-align: right; color: #6b7280; font-size: 14px;">Biên lợi nhuận dự kiến:</td>
              <td style="padding: 5px 0; text-align: right; color: #111827; font-size: 14px;">${margin || 0}%</td>
            </tr>
            <tr>
              <td style="padding: 15px 0 5px 0; text-align: right; color: #111827; font-size: 16px; font-weight: bold; text-transform: uppercase;">TỔNG TIỀN THANH TOÁN:</td>
              <td style="padding: 15px 0 5px 0; text-align: right; color: #ea580c; font-size: 24px; font-weight: 900;">${quotePrice.toLocaleString('vi-VN')} VNĐ</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
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
      from: '"MiniERP NhomKinh" <no-reply@minierp.com>',
      to: email,
      subject: `Báo Giá Đơn Hàng - ${customer}`,
      html: htmlContent,
    });

    let previewUrl = null;
    if (!isRealSMTP) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("Email Preview URL:", previewUrl);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Email sent successfully",
      previewUrl 
    }, { status: 200 });
    
  } catch (error: unknown) {
    console.error("Email Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi server không xác định";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
