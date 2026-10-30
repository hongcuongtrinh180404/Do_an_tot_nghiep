import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Khởi tạo transporter nodemailer dựa trên cấu hình SMTP
   */
  private createTransporter(): Transporter | null {
    const gmailUser = this.configService.get<string>('GMAIL_USER')?.trim();
    const gmailAppPassword = this.configService.get<string>('GMAIL_APP_PASSWORD')?.trim();

    if (!gmailUser || !gmailAppPassword) {
      return null;
    }

    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = Number(this.configService.get<string>('SMTP_PORT')) || 587;
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
  }

  /**
   * Gửi email chứa liên kết kích hoạt tài khoản Mindly
   */
  async sendVerificationEmail(
    to: string,
    fullName: string,
    token: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const transporter = this.createTransporter();

    // Nếu người dùng chưa cấu hình Gmail App Password trong .env:
    // Tự động fallback in link kích hoạt ra terminal để dev và test trực tiếp
    if (!transporter) {
      this.logger.warn(`
================================================================================
  MINDLY EMAIL VERIFICATION (SMTP CHƯA CẤU HÌNH TRONG .ENV)
  Gửi đến: ${to} (${fullName})
  Link kích hoạt: ${verificationUrl}
  Hạn sử dụng: 24 giờ
  (Hãy cấu hình GMAIL_USER và GMAIL_APP_PASSWORD trong backend/.env để gửi email thật)
================================================================================`);
      return true;
    }

    const fromName =
      this.configService.get<string>('MAIL_FROM_NAME') || 'Mindly - Map Your Mind';
    const fromEmail =
      this.configService.get<string>('MAIL_FROM_EMAIL') ||
      this.configService.get<string>('GMAIL_USER') ||
      'noreply@mindly.vn';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Xác thực tài khoản Mindly</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #0f172a; padding: 32px 24px; text-align: center; }
          .header h1 { color: #38bdf8; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { color: #94a3b8; margin: 6px 0 0; font-size: 13px; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .button-container { text-align: center; margin: 32px 0; }
          .button { display: inline-block; background: #0284c7; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25); }
          .link-box { background: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 12px; color: #64748b; word-break: break-all; margin-top: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MINDLY</h1>
            <p>Hệ Thống Đào Tạo & Quản Lý Đồ Án Tốt Nghiệp</p>
          </div>
          <div class="content">
            <div class="greeting">Xin chào ${fullName},</div>
            <div class="text">
              Cảm ơn bạn đã đăng ký tài khoản trên nền tảng <strong>Mindly</strong>. 
              Để bảo vệ quyền lợi và xác thực hòm thư của bạn, vui lòng nhấn nút bên dưới để kích hoạt tài khoản:
            </div>
            <div class="button-container">
              <a href="${verificationUrl}" class="button" target="_blank">Kích Hoạt Tài Khoản Ngay</a>
            </div>
            <div class="text" style="font-size: 13px; color: #64748b;">
              ⏱️ <em>Liên kết này có hiệu lực trong vòng <strong>24 giờ</strong>. Nếu bạn không thực hiện đăng ký này, xin vui lòng bỏ qua email.</em>
            </div>
            <div class="link-box">
              Nếu nút trên không hoạt động, bạn có thể copy và dán đường dẫn sau vào trình duyệt:<br />
              <a href="${verificationUrl}" style="color: #0284c7;">${verificationUrl}</a>
            </div>
          </div>
          <div class="footer">
            © 2026 Mindly Platform. Mọi quyền được bảo lưu.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: '[Mindly] Xác thực và kích hoạt tài khoản của bạn',
        html: htmlContent,
      });

      this.logger.log(`Đã gửi email kích hoạt thành công đến: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Không thể gửi email xác thực qua SMTP đến ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // In fallback link ra terminal để không bị nghẽn quy trình
      this.logger.warn(`Link kích hoạt dự phòng (do lỗi SMTP): ${verificationUrl}`);
      return false;
    }
  }

  /**
   * Gửi liên kết tạo hoặc đặt lại mật khẩu Mindly (hiệu lực 15 phút).
   */
  async sendPasswordResetEmail(
    to: string,
    fullName: string,
    token: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const transporter = this.createTransporter();

    // Nếu chưa cấu hình Gmail App Password trong .env, in link ra terminal để
    // dev/test có thể đi tiếp mà không cần SMTP thật.
    if (!transporter) {
      this.logger.warn(`
================================================================================
  MINDLY PASSWORD RESET (SMTP CHƯA CẤU HÌNH TRONG .ENV)
  Gửi đến: ${to} (${fullName})
  Link đặt lại mật khẩu: ${resetUrl}
  Hạn sử dụng: 15 phút
  (Hãy cấu hình GMAIL_USER và GMAIL_APP_PASSWORD trong backend/.env để gửi email thật)
================================================================================`);
      return true;
    }

    const fromName =
      this.configService.get<string>('MAIL_FROM_NAME') || 'Mindly - Map Your Mind';
    const fromEmail =
      this.configService.get<string>('MAIL_FROM_EMAIL') ||
      this.configService.get<string>('GMAIL_USER') ||
      'noreply@mindly.vn';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Thiết lập mật khẩu Mindly</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #0f172a; padding: 32px 24px; text-align: center; }
          .header h1 { color: #38bdf8; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { color: #94a3b8; margin: 6px 0 0; font-size: 13px; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .button-container { text-align: center; margin: 32px 0; }
          .button { display: inline-block; background: #0284c7; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25); }
          .link-box { background: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 12px; color: #64748b; word-break: break-all; margin-top: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MINDLY</h1>
            <p>Hệ Thống Đào Tạo & Quản Lý Đồ Án Tốt Nghiệp</p>
          </div>
          <div class="content">
            <div class="greeting">Xin chào ${fullName},</div>
            <div class="text">
              Chúng tôi nhận được yêu cầu tạo hoặc đặt lại mật khẩu cho tài khoản <strong>Mindly</strong> liên kết với email này.
              Nhấn nút bên dưới để thiết lập mật khẩu đăng nhập Mindly:
            </div>
            <div class="button-container">
              <a href="${resetUrl}" class="button" target="_blank">Thiết Lập Mật Khẩu Mindly</a>
            </div>
            <div class="text" style="font-size: 13px; color: #64748b;">
              ⏱️ <em>Liên kết này có hiệu lực trong vòng <strong>15 phút</strong> và chỉ sử dụng được một lần.</em>
            </div>
            <div class="text" style="font-size: 13px; color: #64748b;">
              Nếu bạn đã liên kết Google, bạn vẫn có thể đăng nhập bằng Google sau khi tạo mật khẩu riêng cho Mindly.
            </div>
            <div class="text" style="font-size: 13px; color: #64748b;">
              Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Tài khoản chỉ được cập nhật khi bạn xác nhận mật khẩu mới.
            </div>
            <div class="link-box">
              Nếu nút trên không hoạt động, bạn có thể copy và dán đường dẫn sau vào trình duyệt:<br />
              <a href="${resetUrl}" style="color: #0284c7;">${resetUrl}</a>
            </div>
          </div>
          <div class="footer">
            © 2026 Mindly Platform. Mọi quyền được bảo lưu.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: '[Mindly] Thiết lập mật khẩu tài khoản của bạn',
        html: htmlContent,
      });

      this.logger.log(`Đã gửi email đặt lại mật khẩu thành công đến: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Không thể gửi email đặt lại mật khẩu qua SMTP đến ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
