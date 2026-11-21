var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RiverKeyManager_1;
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { RiverAllKeysExhaustedException } from './gemini.errors.js';
let RiverKeyManager = RiverKeyManager_1 = class RiverKeyManager {
    configService;
    logger = new Logger(RiverKeyManager_1.name);
    keys = [];
    currentIndex = -1;
    clientCache = new Map();
    constructor(configService) {
        this.configService = configService;
        this.initializeKeys();
    }
    static maskKey(key) {
        if (!key || key.length <= 10)
            return '***';
        return `${key.slice(0, 6)}...${key.slice(-4)}`;
    }
    initializeKeys() {
        this.keys = [];
        this.clientCache.clear();
        const detectedKeys = [];
        for (let i = 1; i <= 3; i++) {
            const envName = `RIVER_API_KEY_${i}`;
            const keyValue = this.configService.get(envName, '').trim();
            if (keyValue) {
                detectedKeys.push({ name: envName, key: keyValue });
            }
        }
        const generalKey = this.configService.get('RIVER_API_KEY', '').trim();
        if (generalKey && !detectedKeys.some((k) => k.key === generalKey)) {
            detectedKeys.push({ name: 'RIVER_API_KEY', key: generalKey });
        }
        let validCount = 0;
        detectedKeys.forEach((item, index) => {
            const isPlaceholder = item.key.includes('your_') ||
                item.key.includes('key_thuc_te') ||
                item.key.includes('placeholder');
            if (isPlaceholder) {
                this.logger.warn(`Bỏ qua [${item.name}]: Đây là giá trị placeholder (${item.key}), chưa phải key thực tế.`);
                return;
            }
            const masked = RiverKeyManager_1.maskKey(item.key);
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
            this.logger.log(`RiverKeyManager đã khởi tạo thành công với ${validCount}/${detectedKeys.length} key khả dụng.`);
        }
        else {
            this.logger.log('RiverKeyManager: Chưa có River API key hợp lệ nào được cấu hình.');
        }
    }
    isConfigured() {
        return this.keys.length > 0;
    }
    getNextAvailableKey() {
        if (this.keys.length === 0) {
            this.logger.warn('Không tìm thấy bất kỳ River API key hợp lệ nào trong môi trường cấu hình!');
            throw new RiverAllKeysExhaustedException('Không có River API Key nào được cấu hình trong hệ thống.');
        }
        const now = Date.now();
        for (const key of this.keys) {
            if (key.status === 'COOLDOWN' && now >= key.cooldownUntil) {
                key.status = 'ACTIVE';
                key.cooldownUntil = 0;
                this.logger.log(`River Key [${key.name} (${key.maskedKey})] đã hết hạn cooldown, tự động phục hồi về ACTIVE.`);
            }
        }
        const totalKeys = this.keys.length;
        for (let attempt = 0; attempt < totalKeys; attempt++) {
            this.currentIndex = (this.currentIndex + 1) % totalKeys;
            const candidate = this.keys[this.currentIndex];
            if (candidate.status === 'ACTIVE') {
                return candidate;
            }
        }
        const cooldownKeys = this.keys.filter((k) => k.status === 'COOLDOWN');
        if (cooldownKeys.length > 0) {
            const shortestWaitMs = Math.min(...cooldownKeys.map((k) => Math.max(0, k.cooldownUntil - now)));
            const waitSeconds = Math.ceil(shortestWaitMs / 1000);
            this.logger.warn(`Tất cả River API key đều đang bị COOLDOWN. Key sớm nhất mở lại sau ${waitSeconds}s.`);
            throw new RiverAllKeysExhaustedException(`Tất cả River API key đều đang quá tải hạn mức. Vui lòng thử lại sau khoảng ${waitSeconds} giây.`);
        }
        this.logger.error('Toàn bộ River API key đều ở trạng thái DEAD (không hợp lệ hoặc bị thu hồi).');
        throw new RiverAllKeysExhaustedException('Toàn bộ River API key đều không hợp lệ hoặc bị thu hồi. Vui lòng kiểm tra lại cấu hình.');
    }
    markCooldown(keyIndex, errorMsg) {
        const key = this.keys.find((k) => k.index === keyIndex);
        if (!key)
            return;
        key.failureCount++;
        const baseCooldownMs = 30000;
        const cooldownMs = Math.min(baseCooldownMs * Math.pow(2, key.failureCount - 1), 300000);
        key.cooldownUntil = Date.now() + cooldownMs;
        key.status = 'COOLDOWN';
        this.logger.warn(`[River Cooldown] Key [${key.name} (${key.maskedKey})] bị tạm dừng ${cooldownMs / 1000}s (Lần lỗi: ${key.failureCount}). Lý do: ${errorMsg || '429 Rate Limit'}`);
    }
    markDead(keyIndex, reason) {
        const key = this.keys.find((k) => k.index === keyIndex);
        if (!key)
            return;
        key.status = 'DEAD';
        this.logger.error(`[River DEAD] Key [${key.name} (${key.maskedKey})] đã bị đánh dấu DEAD vĩnh viễn do lỗi xác thực. Lý do: ${reason || 'Invalid API Key'}`);
    }
    recordSuccess(keyIndex) {
        const key = this.keys.find((k) => k.index === keyIndex);
        if (!key)
            return;
        key.lastUsedAt = Date.now();
        key.failureCount = 0;
    }
    getClient(apiKey, baseUrl, timeoutMs) {
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
    getKeysHealthStatus() {
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
};
RiverKeyManager = RiverKeyManager_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], RiverKeyManager);
export { RiverKeyManager };
//# sourceMappingURL=river-key.manager.js.map