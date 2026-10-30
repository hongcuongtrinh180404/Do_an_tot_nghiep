import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import { ClsService } from 'nestjs-cls';
import mongoose, { type Model } from 'mongoose';
import { AUTH_CONSTANTS, UserStatusEnum } from 'share-lib';
import { AuthService } from '../../src/modules/auth/services/auth.service.js';
import { AuthTokenService } from '../../src/modules/auth/services/auth-token.service.js';
import { LocalAuthService } from '../../src/modules/auth/services/local-auth.service.js';
import { PasswordResetService } from '../../src/modules/auth/services/password-reset.service.js';
import { MailService } from '../../src/modules/mail/mail.service.js';
import { SessionRepository } from '../../src/modules/session/repositories/session.repository.js';
import { SessionEntity, SessionSchema } from '../../src/modules/session/schemas/session.schema.js';
import { SessionService } from '../../src/modules/session/services/session.service.js';
import { UserRepository } from '../../src/modules/user/repositories/user.repository.js';
import { UserEntity, UserSchema } from '../../src/modules/user/schemas/user.schema.js';
import { UserService } from '../../src/modules/user/services/user.service.js';

// Uses an isolated database on a transaction-capable MongoDB instance.
// Google token verification and outgoing mail are mocked; persistence and bcrypt are real.
describe('Google password setup (MongoDB integration)', () => {
  const databaseName = `mindly_password_setup_test_${process.pid}`;
  const email = 'google-password-setup@example.com';
  const googleSub = 'google-password-setup-sub';
  const password = 'Mindly-test-password-123';
  const config = new ConfigService({
    JWT_SECRET: 'password-setup-test-access-secret',
    JWT_REFRESH_SECRET: 'password-setup-test-refresh-secret',
    GOOGLE_CLIENT_ID: 'password-setup-test-client',
  });
  const connection = mongoose.createConnection();
  const mailService = new MailService(config);
  const tokenService = new AuthTokenService(new JwtService(), config);
  const sendMail = vi.spyOn(mailService, 'sendPasswordResetEmail');
  let userModel: Model<UserEntity>;
  let sessionModel: Model<SessionEntity>;
  let userRepository: UserRepository;
  let sessionService: SessionService;
  let authService: AuthService;
  let resetService: PasswordResetService;

  beforeAll(async () => {
    await connection.openUri(process.env.MONGODB_URI || 'mongodb://localhost:27017', {
      dbName: databaseName,
      serverSelectionTimeoutMS: 5000,
    });
    userModel = connection.model(UserEntity.name, UserSchema);
    sessionModel = connection.model(SessionEntity.name, SessionSchema);
    await Promise.all([userModel.init(), sessionModel.init()]);

    const cls = new ClsService(new AsyncLocalStorage());
    userRepository = new UserRepository(userModel);
    const userService = new UserService(userRepository, cls);
    sessionService = new SessionService(new SessionRepository(sessionModel), cls);
    const localAuthService = new LocalAuthService(userService);
    resetService = new PasswordResetService(
      userService, sessionService, mailService, localAuthService, tokenService,
    );
    authService = new AuthService(
      userService, sessionService, localAuthService, tokenService, config, mailService,
    );
  }, 15000);

  beforeEach(async () => {
    await Promise.all([userModel.deleteMany({}), sessionModel.deleteMany({})]);
    sendMail.mockReset().mockResolvedValue(true);
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () =>
      new LoginTicket('test-header', {
        iss: 'https://accounts.google.com',
        aud: 'password-setup-test-client',
        sub: googleSub,
        email,
        email_verified: true,
        name: 'Google Password Setup',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    try {
      if (connection.readyState === 1 && connection.name === databaseName) {
        await connection.dropDatabase();
      }
    } finally {
      await connection.close();
    }
  });

  async function createGoogleUser() {
    return authService.loginWithGoogle({ idToken: 'verified-google-id-token' });
  }

  function sentToken(index = 0): string {
    const call = sendMail.mock.calls[index];
    expect(call).toBeDefined();
    return call[2];
  }

  it('creates a first local password and keeps both login methods on the same account', async () => {
    const originalLogin = await createGoogleUser();
    const response = await resetService.requestReset({ email });
    expect(response.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const before = await userRepository.findByEmailForPasswordReset(email);
    expect(before?.passwordHash).toBeNull();
    expect(before?.passwordResetTokenHash).toBe(tokenService.hashToken(sentToken()));

    await resetService.resetPassword({ token: sentToken(), password });
    const after = await userRepository.findByEmailForPasswordReset(email);
    expect(after?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(after?.googleSub).toBe(googleSub);
    expect(after?.role).toBe(originalLogin.user.role);
    expect(after?.passwordResetTokenHash).toBeNull();
    expect(await sessionModel.countDocuments({ isRevoked: false })).toBe(0);
    await expect(authService.refreshToken({
      refreshToken: originalLogin.tokens.refreshToken,
    })).rejects.toThrow();
    await expect(resetService.resetPassword({ token: sentToken(), password })).rejects.toThrow(
      AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    );

    const localLogin = await authService.login({ email, password });
    const googleLogin = await createGoogleUser();
    expect(localLogin.user.id).toBe(originalLogin.user.id);
    expect(googleLogin.user.id).toBe(originalLogin.user.id);
    expect(googleLogin.user.googleSub).toBe(googleSub);
    expect(await userModel.countDocuments()).toBe(1);
    await expect(authService.login({ email, password: 'wrong-password' })).rejects.toThrow();
  });

  it('enforces cooldown for concurrent Google requests and invalidates the old link on resend', async () => {
    await createGoogleUser();
    await Promise.all([
      resetService.requestReset({ email }),
      resetService.requestReset({ email }),
    ]);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const oldToken = sentToken();

    await userModel.updateOne({ email }, {
      $set: { passwordResetRequestedAt: new Date(Date.now() - AUTH_CONSTANTS.PASSWORD_RESET_COOLDOWN_MS - 1000) },
    });
    await resetService.requestReset({ email });
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sentToken(1)).not.toBe(oldToken);
    await expect(resetService.resetPassword({ token: oldToken, password })).rejects.toThrow(
      AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    );
    await resetService.resetPassword({ token: sentToken(1), password });
    await expect(authService.login({ email, password })).resolves.toBeDefined();
  });

  it.each([
    { name: 'unverified', changes: { isEmailVerified: false } },
    { name: 'inactive', changes: { status: UserStatusEnum.INACTIVE } },
    { name: 'banned', changes: { status: UserStatusEnum.BANNED } },
    { name: 'deleted', changes: { deletedAt: new Date() } },
    { name: 'unlinked without password', changes: { googleSub: null } },
  ])('rejects a $name Google account in both the service and atomic claim', async ({ changes }) => {
    const login = await createGoogleUser();
    await userModel.updateOne({ email }, { $set: changes });

    const response = await resetService.requestReset({ email });
    expect(response.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
    expect(sendMail).not.toHaveBeenCalled();
    const claimed = await userRepository.claimPasswordResetRequest(
      login.user.id, tokenService.hashToken('test-token'),
      new Date(Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_TTL_MS),
      new Date(), new Date(Date.now() - AUTH_CONSTANTS.PASSWORD_RESET_COOLDOWN_MS),
    );
    expect(claimed).toBeNull();
  });

  it('clears a failed Google mail request so the backend can retry immediately', async () => {
    await createGoogleUser();
    sendMail.mockResolvedValueOnce(false);
    await resetService.requestReset({ email });
    const failed = await userRepository.findByEmailForPasswordReset(email);
    expect(failed?.passwordHash).toBeNull();
    expect(failed?.passwordResetTokenHash).toBeNull();
    expect(failed?.passwordResetRequestedAt).toBeNull();

    await resetService.requestReset({ email });
    expect(sendMail).toHaveBeenCalledTimes(2);
    await resetService.resetPassword({ token: sentToken(1), password });
    await expect(authService.login({ email, password })).resolves.toBeDefined();
  });

  it('does not create a password using an expired link', async () => {
    await createGoogleUser();
    await resetService.requestReset({ email });
    await userModel.updateOne({ email }, { $set: { passwordResetExpires: new Date(Date.now() - 1000) } });
    await expect(resetService.resetPassword({ token: sentToken(), password })).rejects.toThrow(
      AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    );
    const user = await userRepository.findByEmailForPasswordReset(email);
    expect(user?.passwordHash).toBeNull();
  });

  it('allows only one concurrent submission to create the first password', async () => {
    await createGoogleUser();
    await resetService.requestReset({ email });
    const results = await Promise.allSettled([
      resetService.resetPassword({ token: sentToken(), password }),
      resetService.resetPassword({ token: sentToken(), password }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    await expect(authService.login({ email, password })).resolves.toBeDefined();
  });

  it('rolls back password creation if session revocation fails, preserving the link for retry', async () => {
    await createGoogleUser();
    await resetService.requestReset({ email });
    const revoke = vi.spyOn(sessionService, 'revokeAllUserSessions').mockRejectedValueOnce(
      new Error('Simulated session revocation failure'),
    );
    try {
      await expect(resetService.resetPassword({ token: sentToken(), password })).rejects.toThrow(
        'Simulated session revocation failure',
      );
      const user = await userRepository.findByEmailForPasswordReset(email);
      expect(user?.passwordHash).toBeNull();
      expect(user?.passwordResetTokenHash).toBe(tokenService.hashToken(sentToken()));
      expect(await sessionModel.countDocuments({ isRevoked: false })).toBe(1);
    } finally {
      revoke.mockRestore();
    }
    await resetService.resetPassword({ token: sentToken(), password });
    await expect(authService.login({ email, password })).resolves.toBeDefined();
  });
});
