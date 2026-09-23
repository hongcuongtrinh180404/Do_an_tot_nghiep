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
- **Gotcha 5 (Next.js SSR Hydration & Client-Only Storage Guard)**:
  - Accessing `localStorage` during initial component render or SSR causes React hydration mismatch errors, because the server render cannot read client storage.
  - Furthermore, browser extensions injecting custom attributes into `<body>` trigger Next.js hydration warnings.
  - Files exporting React hooks (`useQuery`, `useMutation`, `useState`, `useEffect`) must have `'use client';` directive when re-exported through feature barrels.
  - **Resolution**:
    - Added `suppressHydrationWarning` on `<html>` and `<body>` in `frontend/src/app/layout.tsx`.
    - Added `isMounted` guard in `useCurrentUserQuery` and `frontend/src/app/page.tsx` so the initial render state matches server HTML identically before evaluating `localStorage`.
    - Added `'use client';` to `frontend/src/features/auth/api/auth.api.ts`.

- **Gotcha 6 (TypeScript Express.Multer Typing with ESM)**:
  - When `"types"` is explicitly specified in `tsconfig.json`, TypeScript omits automatic discovery of `@types/multer`.
  - **Resolution**: Added `"multer"` to `"types": ["vitest/globals", "node", "multer"]` in `backend/tsconfig.json` to allow `Express.Multer.File` in controller and service parameter annotations.
- **Gotcha 7 (React 19 Hooks ESLint & Instant Image Fallback)**:
  - Setting error states synchronously inside `useEffect` triggers React 19 `react-hooks/set-state-in-effect`.
  - **Resolution**: Replaced boolean error state and effect with `failedUrl` string comparison state (`failedUrl !== displayImage`), avoiding cascading re-renders while ensuring clean fallback to initial letters.

- **Gotcha 8 (MongoDB Partial Unique Index with Soft Delete & Sparse Nulls)**:
  - In MongoDB, setting `{ unique: true, sparse: true }` on a field like `username` still enforces uniqueness against `null` if documents explicitly store `{ username: null }` (BSON type 10).
  - Furthermore, soft deleted documents (`deletedAt != null`) would block new users from reusing a soft-deleted email or username if simple unique indexes were used.
  - **Resolution**: Configured `partialFilterExpression: { deletedAt: null }` for `email`, and `partialFilterExpression: { deletedAt: null, username: { $type: "string" } }` for `username`. This guarantees:
    1. Multiple active users with `username: null` or `undefined` never conflict.
    2. Active users have strictly unique emails and usernames.
    3. Soft-deleted accounts release their email and username for future registration.
    4. Verified with 10 real MongoDB integration test cases in `user.schema.integration.spec.ts`.

---

## 2. Change Log & Bug Fixes

### [2026-09-22] - Mongoose User Schema v1 & Partial Unique Indexes Implementation

- **Specification & Domain Isolation**:
  - Implemented initial `User` schema focused exclusively on authentication, profile, and basic RBAC without bleeding into Course, Video, Quiz, Payment, or Enrollment collections.
  - Enforced required fields: `email` (lowercase, unique), `passwordHash` (`select: false`), `fullName`.
  - Enforced optional profile fields: `username` (lowercase, sparse unique), `avatarUrl` (Cloudinary URL), `bio`.
  - Enforced lowercase role (`student`, `instructor`, `admin`, default `student`) and status (`active`, `inactive`, `banned`, default `active`).
  - Inherited Mongoose timestamps and audit metadata via `BaseAbstractDocument`.
- **Contracts (`share-lib`)**:
  - Updated `RoleEnum` with lowercase string values (`student`, `instructor`, `admin`) and backward-compatible alias.
  - Updated `UserStatusEnum` with lowercase string values (`active`, `inactive`, `banned`).
  - Updated `IUser` and `IUserProfile` interfaces to support new fields.
- **Backend Persistence & Architecture**:
  - Preserved strict `BaseMongoRepository` & `UserRepository` patterns without raw model injection in services.
  - Updated `UserRepository` to select `+passwordHash` when requested, and added `findByUsername()`.
  - Updated `UserService` and `AuthService` registration & profile flows.
- **Verification & Tests**:
  - Created dedicated MongoDB integration test suite (`user.schema.integration.spec.ts`) passing 10 test cases against active MongoDB instance.
  - All 9 backend test files (56 unit & integration tests) pass 100%. Type check `npx tsc --noEmit` clean across workspace.

### [2026-09-21] - User Profile Management & Cloudinary Avatar Upload Implementation

- **Backend (NestJS + Cloudinary + MongoDB)**:
  - Installed `cloudinary` and `@types/multer` dependencies.
  - Created `CloudinaryService` (`src/modules/user/services/cloudinary.service.ts`) using stream upload via `Readable.from(file.buffer)` with automatic facial recognition cropping (`gravity: 'face'`).
  - Added `UpdateProfileDto` with `class-validator` and whitespace normalization (`@Transform`).
  - Extended `UserService` with `getProfile`, `updateProfile`, and `updateAvatar`.
  - Implemented `UserController` (`/api/v1/users`) with `GET /profile`, `PATCH /profile`, and `POST /avatar` (with 5MB limit and image mimetype validation).
  - Updated Joi schema in `env.validation.ts` and declared `CLOUDINARY_*` variables in `backend/.env.example` and `backend/.env`.
  - Added unit test suite `user.service.avatar.spec.ts`. All 46 backend tests across 8 suites passing 100%.
- **Frontend (Next.js App Router + React + Tailwind CSS)**:
  - Configured `images.remotePatterns` for `res.cloudinary.com` in `next.config.ts`.
  - Declared frontend domain (`NEXT_PUBLIC_APP_URL`) and Cloudinary client configs in `frontend/.env.example` and `frontend/.env`.
  - Created feature module `frontend/src/features/profile/`:
    - `types/profile.types.ts`: Domain models for update payload and upload response.
    - `schemas/profile.schema.ts`: Zod schema validating input with whitespace trimming.
    - `api/profile.api.ts`: TanStack Query hooks (`useUpdateProfileMutation`, `useUploadAvatarMutation`, `useUserProfileQuery`) with automatic multi-query cache invalidation and `sonner` notifications.
    - `components/avatar-uploader.tsx`: Interactive avatar uploader supporting drag-and-drop, click-to-upload, instant local preview, Cloudinary storage indicator, and initial letter fallback.
    - `components/profile-form.tsx`: Edit form for firstName/lastName with reset and loading states.
    - `components/profile-info-card.tsx`: Account metadata overview (Email, Role, Auth Provider, Status, UID).
    - `components/profile-page-content.tsx`: Rich aesthetic layout adhering to Purple Ban and No Inline Fonts.
  - Created `/profile` route (`frontend/src/app/profile/page.tsx`).
  - Updated home page (`frontend/src/app/page.tsx`) to display user avatar and link directly to `/profile`.
  - Verified `pnpm --filter frontend lint` and `pnpm --filter frontend build` pass with 0 errors.

### [2026-09-21] - Fix Hydration Mismatch on RootLayout & Home Auth State

- **Frontend Layout & Root (`frontend/src/app/layout.tsx`)**:
  - Added `suppressHydrationWarning` to `<html>` and `<body>` to ignore injected browser extension attributes (`__processed_...__`).
- **Auth Query & State (`frontend/src/features/auth/api/auth.api.ts`)**:
  - Added `'use client';` directive.
  - Guarded `useCurrentUserQuery` `hasToken` with `isMounted` flag to prevent reading `localStorage` during SSR / initial hydration.
- **Home Page (`frontend/src/app/page.tsx`)**:
  - Guarded auth session profile / login card rendering with `!isMounted || isLoading` to eliminate layout DOM differences between SSR and client.
  - Verified `pnpm --filter frontend build` passes with 0 errors.

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
