import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  IRiverKeyManager,
  RiverKeyHealthStatus,
  RiverKeyMetadata,
} from './interfaces/gemini.interface.js';
import { RiverAllKeysExhaustedException } from './gemini.errors.js';

@Injectable()
export class RiverKeyManager implements IRiverKeyManager {
  private readonly logger = new Logger(RiverKeyManager.name);
  private keys: RiverKeyMetadata[] = [];
  private currentIndex = -1;
  private readonly clientCache = new Map<string, OpenAI>();

  constructor(private readonly configService: ConfigService) {
    this.initializeKeys();
  }

  /**
   * Helper mask key: chỉ hiển thị 6 ký tự đầu và 4 ký tự cuối để bảo vệ PII trong logs.
   */
  public static maskKey(key: string): string {
    if (!key || key.length <= 10) return '***';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  }

  /**
   * Nạp và chuẩn hóa danh sách River API Keys từ ConfigService
   */
  public initializeKeys(): void {
    this.keys = [];
    this.clientCache.clear();
    const detectedKeys: { name: string; key: string }[] = [];

    // 1. Quét từ RIVER_API_KEY_1 đến RIVER_API_KEY_3
    for (let i = 1; i <= 3; i++) {
      const envName = `RIVER_API_KEY_${i}`;
      const keyValue = this.configService.get<string>(envName, '').trim();
      if (keyValue) {
        detectedKeys.push({ name: envName, key: keyValue });
      }
    }

    // 2. Fallback kiểm tra thêm biến chung RIVER_API_KEY nếu chưa có trong danh sách
    const generalKey = this.configService.get<string>('RIVER_API_KEY', '').trim();
    if (generalKey && !detectedKeys.some((k) => k.key === generalKey)) {
      detectedKeys.push({ name: 'RIVER_API_KEY', key: generalKey });
    }

    let validCount = 0;
    detectedKeys.forEach((item, index) => {
      // Bỏ qua placeholder chưa được cấu hình thực tế
      const isPlaceholder =
        item.key.includes('your_') ||
        item.key.includes('key_thuc_te') ||
        item.key.includes('placeholder');

      if (isPlaceholder) {
        this.logger.warn(
          `Bỏ qua [${item.name}]: Đây là giá trị placeholder (${item.key}), chưa phải key thực tế.`,
        );
        return;
      }

      const masked = RiverKeyManager.maskKey(item.key);
      this.keys.push({
        index,
        name: item.name,
        key: item.key,
        maskedKey: masked,
        status: 'ACTIVE',
        cooldownUntil: 0,
        failureCount: 0,
        lastUsedAt: 0,
      });
      validCount++;
    });

    if (validCount > 0) {
      this.logger.log(
        `RiverKeyManager đã khởi tạo thành công với ${validCount}/${detectedKeys.length} key khả dụng.`,
      );
    } else {
      this.logger.log('RiverKeyManager: Chưa có River API key hợp lệ nào được cấu hình.');
    }
  }

  /**
   * Kiểm tra xem River AI có bất kỳ API key hợp lệ nào được cấu hình hay không
   */
  public isConfigured(): boolean {
    return this.keys.length > 0;
  }

  /**
   * Lấy API Key khả dụng tiếp theo theo thuật toán Round-Robin có kiểm tra sức khỏe
   */
  public getNextAvailableKey(): RiverKeyMetadata {
    if (this.keys.length === 0) {
      this.logger.warn('Không tìm thấy bất kỳ River API key hợp lệ nào trong môi trường cấu hình!');
      throw new RiverAllKeysExhaustedException('Không có River API Key nào được cấu hình trong hệ thống.');
    }

    const now = Date.now();

    // 1. Phục hồi các key hết hạn cooldown về trạng thái ACTIVE
    for (const key of this.keys) {
      if (key.status === 'COOLDOWN' && now >= key.cooldownUntil) {
        key.status = 'ACTIVE';
        key.cooldownUntil = 0;
        this.logger.log(`River Key [${key.name} (${key.maskedKey})] đã hết hạn cooldown, tự động phục hồi về ACTIVE.`);
      }
    }

    // 2. Tìm kiếm key ACTIVE kế tiếp theo vòng tròn (Round-Robin)
    const totalKeys = this.keys.length;
    for (let attempt = 0; attempt < totalKeys; attempt++) {
      this.currentIndex = (this.currentIndex + 1) % totalKeys;
      const candidate = this.keys[this.currentIndex];

      if (candidate.status === 'ACTIVE') {
        return candidate;
      }
    }

    // 3. Nếu không có key nào ACTIVE, kiểm tra xem còn key cooldown hay toàn bộ đã DEAD
    const cooldownKeys = this.keys.filter((k) => k.status === 'COOLDOWN');
    if (cooldownKeys.length > 0) {
      const shortestWaitMs = Math.min(...cooldownKeys.map((k) => Math.max(0, k.cooldownUntil - now)));
      const waitSeconds = Math.ceil(shortestWaitMs / 1000);
      this.logger.warn(`Tất cả River API key đều đang bị COOLDOWN. Key sớm nhất mở lại sau ${waitSeconds}s.`);
      throw new RiverAllKeysExhaustedException(
        `Tất cả River API key đều đang quá tải hạn mức. Vui lòng thử lại sau khoảng ${waitSeconds} giây.`,
      );
    }

    this.logger.error('Toàn bộ River API key đều ở trạng thái DEAD (không hợp lệ hoặc bị thu hồi).');
    throw new RiverAllKeysExhaustedException(
      'Toàn bộ River API key đều không hợp lệ hoặc bị thu hồi. Vui lòng kiểm tra lại cấu hình.',
    );
  }

  /**
   * Đưa key vào hàng đợi Cooldown khi gặp lỗi Rate Limit (429) với Exponential Backoff
   */
  public markCooldown(keyIndex: number, errorMsg?: string): void {
    const key = this.keys.find((k) => k.index === keyIndex);
    if (!key) return;

    key.failureCount++;
    // Exponential cooldown: 30s -> 60s -> 120s -> tối đa 300s (5 phút)
    const baseCooldownMs = 30000;
    const cooldownMs = Math.min(baseCooldownMs * Math.pow(2, key.failureCount - 1), 300000);
    key.cooldownUntil = Date.now() + cooldownMs;
    key.status = 'COOLDOWN';

    this.logger.warn(
      `[River Cooldown] Key [${key.name} (${key.maskedKey})] bị tạm dừng ${cooldownMs / 1000}s (Lần lỗi: ${key.failureCount}). Lý do: ${errorMsg || '429 Rate Limit'}`,
    );
  }

  /**
   * Đánh dấu key DEAD vĩnh viễn khi gặp lỗi xác thực 401/403 (Key sai hoặc bị thu hồi)
   */
  public markDead(keyIndex: number, reason?: string): void {
    const key = this.keys.find((k) => k.index === keyIndex);
    if (!key) return;

    key.status = 'DEAD';
    this.logger.error(
      `[River DEAD] Key [${key.name} (${key.maskedKey})] đã bị đánh dấu DEAD vĩnh viễn do lỗi xác thực. Lý do: ${reason || 'Invalid API Key'}`,
    );
  }

  /**
   * Ghi nhận key thực hiện thành công để reset failure count
   */
  public recordSuccess(keyIndex: number): void {
    const key = this.keys.find((k) => k.index === keyIndex);
    if (!key) return;

    key.lastUsedAt = Date.now();
    key.failureCount = 0;
  }

  /**
   * Lấy hoặc tái sử dụng OpenAI SDK client theo từng API key
   */
  public getClient(apiKey: string, baseUrl: string, timeoutMs: number): OpenAI {
    const cacheKey = `${apiKey}@${baseUrl}`;
    let client = this.clientCache.get(cacheKey);
    if (!client) {
      client = new OpenAI({
        apiKey,
        baseURL: baseUrl,
        timeout: timeoutMs,
      });
      this.clientCache.set(cacheKey, client);
    }
    return client;
  }

  /**
   * Lấy báo cáo trạng thái sức khỏe của toàn bộ danh sách key River
   */
  public getKeysHealthStatus(): RiverKeyHealthStatus[] {
    const now = Date.now();
    return this.keys.map((k) => ({
      index: k.index,
      name: k.name,
      maskedKey: k.maskedKey,
      status: k.status,
      cooldownRemainingMs: Math.max(0, k.cooldownUntil - now),
      failureCount: k.failureCount,
      lastUsedAt: k.lastUsedAt,
    }));
  }
}
