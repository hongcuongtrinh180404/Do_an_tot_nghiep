import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GeminiKeyHealthStatus,
  GeminiKeyMetadata,
  IGeminiKeyManager,
} from './interfaces/gemini.interface.js';
import { GeminiAllKeysExhaustedException } from './gemini.errors.js';

@Injectable()
export class GeminiKeyManager implements IGeminiKeyManager {
  private readonly logger = new Logger(GeminiKeyManager.name);
  private keys: GeminiKeyMetadata[] = [];
  private currentIndex = -1;

  constructor(private readonly configService: ConfigService) {
    this.initializeKeys();
  }

  /**
   * Helper mask key: chỉ hiển thị 6 ký tự đầu và 4 ký tự cuối.
   * Tuyệt đối không in đầy đủ API key ra console / log.
   */
  public static maskKey(key: string): string {
    if (!key || key.length <= 10) return '***';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  }

  /**
   * Nạp và chuẩn hóa danh sách các Gemini API Key từ ConfigService
   */
  public initializeKeys(): void {
    this.keys = [];
    const detectedKeys: { name: string; key: string }[] = [];

    // 1. Quét từ GEMINI_API_KEY_1 đến GEMINI_API_KEY_6
    for (let i = 1; i <= 6; i++) {
      const envName = `GEMINI_API_KEY_${i}`;
      const keyValue = this.configService.get<string>(envName, '').trim();
      if (keyValue) {
        detectedKeys.push({ name: envName, key: keyValue });
      }
    }

    // 2. Fallback kiểm tra thêm biến chung GEMINI_API_KEY nếu chưa có trong danh sách
    const generalKey = this.configService.get<string>('GEMINI_API_KEY', '').trim();
    if (generalKey && !detectedKeys.some((k) => k.key === generalKey)) {
      detectedKeys.push({ name: 'GEMINI_API_KEY', key: generalKey });
    }

    let validCount = 0;
    detectedKeys.forEach((item, index) => {
      // Nhận diện placeholder chưa cấu hình
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

      const masked = GeminiKeyManager.maskKey(item.key);
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

    this.logger.log(
      `GeminiKeyManager đã khởi tạo thành công với ${validCount}/${detectedKeys.length} key khả dụng.`,
    );
  }

  /**
   * Lấy API Key khả dụng tiếp theo theo thuật toán Round-Robin có kiểm tra sức khỏe
   */
  public getNextAvailableKey(): GeminiKeyMetadata {
    if (this.keys.length === 0) {
      this.logger.error('Không tìm thấy bất kỳ Gemini API key hợp lệ nào trong môi trường cấu hình!');
      throw new GeminiAllKeysExhaustedException('Không có Gemini API Key nào được cấu hình trong hệ thống.');
    }

    const now = Date.now();

    // 1. Phục hồi các key hết hạn cooldown về trạng thái ACTIVE
    for (const key of this.keys) {
      if (key.status === 'COOLDOWN' && now >= key.cooldownUntil) {
        key.status = 'ACTIVE';
        key.cooldownUntil = 0;
        this.logger.log(`Key [${key.name} (${key.maskedKey})] đã hết hạn cooldown, tự động phục hồi về ACTIVE.`);
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
      this.logger.warn(`Tất cả Gemini API key đều đang bị COOLDOWN. Key sớm nhất mở lại sau ${waitSeconds}s.`);
      throw new GeminiAllKeysExhaustedException(
        `Tất cả API key đều đang quá tải hạn mức. Vui lòng thử lại sau khoảng ${waitSeconds} giây.`,
      );
    }

    this.logger.error('Toàn bộ Gemini API key đều ở trạng thái DEAD (không hợp lệ hoặc bị thu hồi).');
    throw new GeminiAllKeysExhaustedException(
      'Toàn bộ API key đều không hợp lệ hoặc bị thu hồi. Vui lòng kiểm tra lại cấu hình.',
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
      `[Cooldown] Key [${key.name} (${key.maskedKey})] bị tạm dừng ${cooldownMs / 1000}s (Lần lỗi: ${key.failureCount}). Lý do: ${errorMsg || '429 Rate Limit'}`,
    );
  }

  /**
   * Đánh dấu key DEAD vĩnh viễn khi gặp lỗi xác thực 400/403 (Key sai hoặc bị thu hồi)
   */
  public markDead(keyIndex: number, reason?: string): void {
    const key = this.keys.find((k) => k.index === keyIndex);
    if (!key) return;

    key.status = 'DEAD';
    this.logger.error(
      `[DeadKey] Key [${key.name} (${key.maskedKey})] đã bị đánh dấu DEAD vĩnh viễn. Lý do: ${reason || 'Invalid API Key'}`,
    );
  }

  /**
   * Ghi nhận lượt gọi thành công để reset failure count
   */
  public recordSuccess(keyIndex: number): void {
    const key = this.keys.find((k) => k.index === keyIndex);
    if (!key) return;

    key.failureCount = 0;
    key.lastUsedAt = Date.now();
  }

  /**
   * Lấy báo cáo trạng thái sức khỏe của các key phục vụ kiểm thử và giám sát
   */
  public getKeysHealthStatus(): GeminiKeyHealthStatus[] {
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

  /**
   * Dùng cho Unit Tests: Nạp danh sách key giả lập
   */
  public setTestKeys(testKeys: { name: string; key: string }[]): void {
    this.keys = testKeys.map((item, index) => ({
      index,
      name: item.name,
      key: item.key,
      maskedKey: GeminiKeyManager.maskKey(item.key),
      status: 'ACTIVE',
      cooldownUntil: 0,
      failureCount: 0,
      lastUsedAt: 0,
    }));
    this.currentIndex = -1;
  }
}
