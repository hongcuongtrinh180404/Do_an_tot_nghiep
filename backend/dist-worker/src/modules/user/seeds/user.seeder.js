var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UserSeeder_1;
import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository.js';
import { DEFAULT_SEED_PASSWORD, USER_SEED_DATA } from './user.seed.data.js';
import { generateUsername } from '../utils/username.util.js';
let UserSeeder = UserSeeder_1 = class UserSeeder {
    userRepository;
    name = 'UserSeeder';
    logger = new Logger(UserSeeder_1.name);
    saltRounds = 10;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    generateUsername(email, excludeUserId) {
        return generateUsername(email, async (candidate) => {
            const owner = await this.userRepository.findByUsername(candidate);
            return Boolean(owner && owner.id !== excludeUserId);
        });
    }
    async run(options) {
        const isRefresh = Boolean(options?.refresh);
        this.logger.log(`Starting User Seeder (refresh: ${isRefresh})...`);
        let createdCount = 0;
        let refreshedCount = 0;
        let skippedCount = 0;
        for (const item of USER_SEED_DATA) {
            const existing = await this.userRepository.findByEmail(item.email, true);
            if (existing) {
                if (isRefresh) {
                    if (existing.deletedAt) {
                        await this.userRepository.restore(existing.id);
                    }
                    const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, this.saltRounds);
                    await this.userRepository.update(existing.id, {
                        fullName: item.fullName,
                        ...(!existing.username
                            ? { username: await this.generateUsername(item.email, existing.id) }
                            : {}),
                        role: item.role,
                        status: item.status,
                        isEmailVerified: true,
                        bio: item.bio,
                        avatarUrl: item.avatarUrl,
                        passwordHash,
                    });
                    this.logger.log(`[REFRESH] Updated user: ${item.email} (${item.role})`);
                    refreshedCount++;
                }
                else {
                    this.logger.log(`[SKIP] User already exists: ${item.email} (${item.role})`);
                    skippedCount++;
                }
            }
            else {
                const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, this.saltRounds);
                await this.userRepository.create({
                    email: item.email,
                    username: await this.generateUsername(item.email),
                    fullName: item.fullName,
                    role: item.role,
                    status: item.status,
                    isEmailVerified: true,
                    bio: item.bio,
                    avatarUrl: item.avatarUrl,
                    passwordHash,
                });
                this.logger.log(`[CREATED] Seeded user: ${item.email} (${item.role})`);
                createdCount++;
            }
        }
        this.logger.log(`User Seeder completed: ${createdCount} created, ${refreshedCount} refreshed, ${skippedCount} skipped.`);
    }
};
UserSeeder = UserSeeder_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UserRepository])
], UserSeeder);
export { UserSeeder };
//# sourceMappingURL=user.seeder.js.map