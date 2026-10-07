import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleEnum, UserStatusEnum, IUser } from 'share-lib';
import { UserSeeder } from '../seeds/user.seeder.js';
import { UserRepository } from '../repositories/user.repository.js';
import { USER_SEED_DATA, DEFAULT_SEED_PASSWORD } from '../seeds/user.seed.data.js';

describe('UserSeeder', () => {
  let seeder: UserSeeder;
  let mockUserRepository: {
    findByEmail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
  };

  const createFakeUser = (email: string, role: RoleEnum): IUser => ({
    id: `id_${email}`,
    email,
    passwordHash: 'old_hashed_password',
    fullName: 'Existing User',
    role,
    status: UserStatusEnum.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      restore: vi.fn(),
    };

    seeder = new UserSeeder(mockUserRepository as unknown as UserRepository);
  });

  it('should have name "UserSeeder"', () => {
    expect(seeder.name).toBe('UserSeeder');
  });

  describe('run (Initial Seeding)', () => {
    it('should create all seed users when they do not exist', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({});

      // Act
      await seeder.run();

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(USER_SEED_DATA.length);
      expect(mockUserRepository.create).toHaveBeenCalledTimes(USER_SEED_DATA.length);
      expect(mockUserRepository.update).not.toHaveBeenCalled();

      // Verify first user (Admin)
      const firstSeed = USER_SEED_DATA[0];
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: firstSeed.email,
          username: firstSeed.username,
          role: firstSeed.role,
          status: firstSeed.status,
          passwordHash: expect.any(String),
        }),
      );
    });
  });

  describe('run (Idempotency - No Refresh)', () => {
    it('should skip creating users when they already exist', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockImplementation((email: string) => {
        return Promise.resolve(createFakeUser(email, RoleEnum.STUDENT));
      });

      // Act
      await seeder.run({ refresh: false });

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(USER_SEED_DATA.length);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('run (Refresh Mode)', () => {
    it('should update existing users and reset password when refresh flag is true', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockImplementation((email: string) => {
        return Promise.resolve(createFakeUser(email, RoleEnum.STUDENT));
      });
      mockUserRepository.update.mockResolvedValue({});

      // Act
      await seeder.run({ refresh: true });

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(USER_SEED_DATA.length);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledTimes(USER_SEED_DATA.length);

      const firstSeed = USER_SEED_DATA[0];
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        `id_${firstSeed.email}`,
        expect.objectContaining({
          fullName: firstSeed.fullName,
          username: firstSeed.username,
          role: firstSeed.role,
          status: firstSeed.status,
          passwordHash: expect.any(String),
        }),
      );
    });

    it('should call restore if an existing user was soft-deleted', async () => {
      // Arrange
      const deletedUser: IUser = {
        ...createFakeUser('admin@thc.edu.vn', RoleEnum.ADMIN),
        deletedAt: new Date(),
      };
      mockUserRepository.findByEmail.mockImplementation((email: string) => {
        if (email === 'admin@thc.edu.vn') {
          return Promise.resolve(deletedUser);
        }
        return Promise.resolve(createFakeUser(email, RoleEnum.STUDENT));
      });
      mockUserRepository.restore.mockResolvedValue(true);
      mockUserRepository.update.mockResolvedValue({});

      // Act
      await seeder.run({ refresh: true });

      // Assert
      expect(mockUserRepository.restore).toHaveBeenCalledWith(deletedUser.id);
    });
  });
});
