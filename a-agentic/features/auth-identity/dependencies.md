# Authentication & Identity — Dependencies & Components

> **Description:** Source files, components, and module dependencies for Auth & Identity across `share-lib`, `backend` (NestJS), and `frontend` (Next.js App Router).

---

## 1. Shared Library (`share-lib`)

- **Enums**:
  - `share-lib/src/enums/role.enum.ts`: `RoleEnum` (`ADMIN`, `USER`)
  - `share-lib/src/enums/auth-provider.enum.ts`: `AuthProviderEnum` (`LOCAL`, `GOOGLE`, `GITHUB`)
  - `share-lib/src/enums/user-status.enum.ts`: `UserStatusEnum` (`ACTIVE`, `INACTIVE`, `SUSPENDED`)
- **Interfaces & Constants**:
  - `share-lib/src/interfaces/auth.interface.ts`: `ILoginPayload`, `IRegisterPayload`, `IAuthTokens`, `IAuthResponse`, `IJwtPayload`, `IForgotPasswordPayload`, `IForgotPasswordResponse`, `IResetPasswordPayload`, `IResetPasswordResponse`
  - `share-lib/src/interfaces/user.interface.ts`: `IUser`, `IUserProfile` (including `passwordResetTokenHash`, `passwordResetExpires`, `passwordResetRequestedAt`)
  - `share-lib/src/interfaces/session.interface.ts`: `ISession`
  - `share-lib/src/interfaces/api-response.interface.ts`: `IApiResponse<T>`
  - `share-lib/src/constants/auth.constants.ts`: `AUTH_CONSTANTS` (Grace period 30s, token lifetimes, password reset TTL 15m, cooldown 60s, reset messages)

---

## 2. Backend Source Files (NestJS)

- **Auth Module (`backend/src/modules/auth/`)**:
  - `auth.controller.ts`: Endpoints (`POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`)
  - `services/auth.service.ts`: Orchestrates registration, login, token refresh, logout, profile fetching, and OAuth expansion hook
  - `services/password-reset.service.ts`: Forgot/reset password and first-password setup for linked Google accounts; anti-enumeration, atomic token claim/consume, SMTP rollback, session revocation
  - `services/local-auth.service.ts`: Password hashing (bcrypt) and credential validation
  - `services/auth-token.service.ts`: JWT access & refresh token signing, SHA-256 token hashing, verification
  - `guards/jwt-auth.guard.ts`: JWT Bearer authentication guard with `@Public()` decorator bypass
  - `guards/roles.guard.ts`: Role-based access control with `ADMIN` role bypass
  - `decorators/public.decorator.ts`, `decorators/roles.decorator.ts`, `decorators/current-user.decorator.ts`
  - `dto/register.dto.ts`, `dto/login.dto.ts`, `dto/refresh-token.dto.ts`, `dto/forgot-password.dto.ts`, `dto/reset-password.dto.ts`: Trimmed validation DTOs
  - `auth.module.ts`: Registers `PasswordResetService` and `ThrottlerModule` (`@nestjs/throttler`, configured via `THROTTLE_TTL` / `THROTTLE_LIMIT`)
    - Converts module defaults with `Number(...)`; route-level `@Throttle` overrides define reset limits. The guard is endpoint-scoped, with default per-instance memory storage.
  - `tests/auth.service.spec.ts`, `tests/roles.guard.spec.ts`, `tests/password-reset.service.spec.ts`
  - `backend/test/auth/password-reset.e2e-spec.ts`: 11 MongoDB integration tests with real repositories/bcrypt/transactions and mocked Google verification/mail; dual login, account eligibility, cooldown/resend, expiry, single-use, SMTP retry and transactional rollback

- **User Module (`backend/src/modules/user/`)**:
  - `schemas/user.schema.ts`: `UserEntity` extending `BaseAbstractDocument`; password reset fields with `select: false` and partial index on `passwordResetTokenHash` (no TTL index)
  - `repositories/user.repository.ts`: Abstract domain repository implementation; `findByEmailForPasswordReset`, `findByPasswordResetTokenHash`, `claimPasswordResetRequest`, `clearPasswordResetRequest`, `consumePasswordResetToken`
    - `claimPasswordResetRequest` accepts an existing local password or a non-blank `googleSub`; both credential eligibility and cooldown are checked atomically.
  - `services/user.service.ts`: User query & conflict verification methods; delegates password reset repository methods and `runInTransaction`
  - `tests/user.service.spec.ts`

- **Mail Module (`backend/src/modules/mail/`)**:
  - `mail.service.ts`: `sendVerificationEmail`, `sendPasswordResetEmail` (15-minute reset link). Missing Gmail credentials currently logs the raw reset URL and returns `true`; configured SMTP send failure returns `false` so `PasswordResetService` clears matching token/cooldown. The fallback lacks a `NODE_ENV` guard and is a documented production security gap.
    - Reset template uses “Thiết lập mật khẩu” for both initial Google password setup and local reset, explaining that existing Google login stays available.

- **Runtime prerequisites**:
  - MongoDB replica set/sharded cluster for the password-update + session-revocation transaction.
  - Existing SMTP/Gmail settings and `FRONTEND_URL`; no new environment variables. See [local setup](../../../docs/GETTING_STARTED.md) and [reset verification checklist](../../../docs/PLAN-forgot-password.md).

- **Session Module (`backend/src/modules/session/`)**:
  - `schemas/session.schema.ts`: `SessionEntity` with TTL indexing on `expiresAt`
  - `repositories/session.repository.ts`: Session domain persistence layer
  - `services/session.service.ts`: Session lifecycle, 30s Grace Period token reuse, replay-attack detection
  - `tests/session.service.spec.ts`

---

## 3. Frontend Source Files (Next.js App Router)

- **App Routes**:
  - `frontend/src/app/(auth)/login/page.tsx`: Authentication login page
  - `frontend/src/app/(auth)/register/page.tsx`: User registration page
  - `frontend/src/app/(auth)/verify-email/page.tsx`: Email verification page
  - `frontend/src/app/(auth)/reset-password/page.tsx`: Password reset page (`?token=...`), wrapped in `Suspense`, `metadata.referrer: 'no-referrer'`
- **Features**:
  - `frontend/src/features/auth/api/auth.api.ts`: Auth API client and TanStack Query hooks, including `useForgotPasswordMutation` and `useResetPasswordMutation`
  - `frontend/src/features/auth/components/forgot-password-modal.tsx`: Centered modal with `form` / `sent` / `error` states and 60-second resend cooldown
  - `frontend/src/features/auth/components/reset-password-content.tsx`: Shared create/reset password form, invalid-token state, success state with redirect to `/login`; Google login remains available
  - `frontend/src/features/auth/schemas/forgot-password.schema.ts`, `reset-password.schema.ts`: Zod validation
  - `frontend/src/features/auth/tests/password-reset-schema.spec.ts`: Schema and anti-enumeration message contract tests
  - `frontend/src/features/auth/components/login-form.tsx`: Adds the right-aligned “Quên mật khẩu?” link and mounts the modal
  - `frontend/src/features/users/`: User tables, user forms, user mutations
- **Auth Provider & Sync**:
  - `frontend/src/context/auth-context.tsx`: Context provider managing current user & session
  - `frontend/src/lib/auth-sync.ts`: Multi-tab synchronization (`BroadcastChannel`, Web Locks API)
