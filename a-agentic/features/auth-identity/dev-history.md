# Authentication & Identity — Development History & Gotchas

> **Description:** Issue logs, resolution history, and architectural gotchas for Auth & Identity.

---

## 1. Important Gotchas & Architectural Pitfalls

- **Gotcha 1 (Admin Bypass Guard)**:
  - When evaluating roles in `RolesGuard`, always check if `user.role === RoleEnum.ADMIN` first to allow super-user bypass without redundant per-endpoint configurations.
- **Gotcha 2 (Multi-Tab Refresh Race Condition & 30s Grace Period)**:
  - When multiple browser tabs refresh simultaneously, strict single-use token rotation causes the losing tab to fail with 401 Unauthorized, wiping local sessions.
  - **Resolution**: Implemented `previousRefreshTokenHash` and `hashRotatedAt` on `SessionEntity`. If a token hash matches `previousRefreshTokenHash` within 30,000ms (`AUTH_CONSTANTS.SESSION_GRACE_PERIOD_MS`), the backend safely returns `{ isReusedGrace: true }` without invalidating the active session. If presented outside 30s, it flags a replay attack and revokes all sessions.
- **Gotcha 3 (Mongoose 9 ClientSession Typing)**:
  - In Mongoose 9 options for `updateOne` and `findOneAndUpdate`, `session?: ClientSession | undefined` is required; passing `session ?? null` causes a strict TypeScript error. Pass `session ?? undefined`.
- **Gotcha 4 (ESM NodeNext & Decorated Signatures)**:
  - When `isolatedModules` and `emitDecoratorMetadata` are enabled in TypeScript 5+, types referenced in decorated parameters (`@CurrentUser() user: IUserProfile`) must use `import type` to avoid runtime undefined symbol references.

---

## 2. Change Log & Bug Fixes

### [2026-09-20] - Auth Module, Share-Lib & Workspace Monorepo Implementation

- **Monorepo Setup**:
  - Configured root `pnpm-workspace.yaml` managing `backend`, `frontend`, and `share-lib`.
  - Configured root `package.json` with scripts for `pnpm dev` (`pnpm --parallel run dev`), `pnpm build`, `pnpm test`, and `pnpm lint`.
- **Share-Lib (`share-lib/`)**:
  - Implemented standalone TypeScript library exporting shared enums (`RoleEnum`, `AuthProviderEnum`, `UserStatusEnum`), interfaces (`IUser`, `IUserProfile`, `ISession`, `IAuthTokens`, `IAuthResponse`, `IJwtPayload`, `IApiResponse`), and constants (`AUTH_CONSTANTS`).
  - Linked to `backend` as `"workspace:*"`.
- **User Domain (`backend/src/modules/user/`)**:
  - `UserEntity` extending `BaseAbstractDocument` with compound indexes on `{ email: 1, deletedAt: 1 }` and `{ provider: 1, providerId: 1 }`.
  - `UserRepository` implementing domain persistence; `UserService` with email conflict checking.
- **Session Domain (`backend/src/modules/session/`)**:
  - `SessionEntity` with TTL indexing on `expiresAt`.
  - `SessionService` implementing 30-second Session Grace Period rotation and replay-attack detection.
- **Auth Domain (`backend/src/modules/auth/`)**:
  - `LocalAuthService`: bcrypt hashing and secure credential verification.
  - `AuthTokenService`: JWT access/refresh token signing, SHA-256 hashing, verification.
  - `AuthService`: Full lifecycle orchestration (register, login, refresh, logout, me, and extensible `validateOAuthLogin` hook for Google OAuth).
  - `AuthController`: Standardized endpoints with `ApiResponse<T>`.
  - `JwtAuthGuard` & `RolesGuard` registered globally with `@Public()` support.
- **Quality & Testing**:
  - 100% test pass rate across 7 test suites (42 unit tests total), adhering strictly to Zero `any` and AAA pattern.
  - Oxlint verified with 0 errors and 0 warnings.
