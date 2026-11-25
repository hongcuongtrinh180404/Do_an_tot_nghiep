import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { MailService } from '../mail.service.js';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

describe('MailService email verification', () => {
  let service: MailService;
  let sendMail: ReturnType<typeof vi.fn>;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    const config: Record<string, string> = {
      FRONTEND_URL: 'https://mindly.example',
      GMAIL_USER: 'noreply@mindly.example',
      GMAIL_APP_PASSWORD: 'test-app-password',
    };
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => config[key]),
    };
    sendMail = vi.fn().mockResolvedValue({ messageId: 'test-message' });
    vi.mocked(nodemailer.createTransport).mockReset();
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as unknown as Transporter);
    service = new MailService(mockConfigService as unknown as ConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should state the 2-hour expiration in the verification email', async () => {
    const sent = await service.sendVerificationEmail(
      'student@example.com',
      'Student',
      'verification-token',
    );

    expect(sent).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'student@example.com',
      html: expect.stringContaining('<strong>2 giờ</strong>'),
    }));
  });

  it('should state the 2-hour expiration in the development fallback log', async () => {
    mockConfigService.get.mockReturnValue(undefined);
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    const sent = await service.sendVerificationEmail(
      'student@example.com',
      'Student',
      'verification-token',
    );

    expect(sent).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Hạn sử dụng: 2 giờ'));
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
