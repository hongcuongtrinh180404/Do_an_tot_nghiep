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
- **Gotcha 9 (MinIO Avatar Replacement & Old Avatar Garbage Collection)**:
  - When users upload a new avatar, the previous avatar file in MinIO must be cleaned up to prevent uncontrolled storage bloat.
  - [x] The process must follow a strict safe order:
    1. Query current user to capture `oldAvatarUrl`.
    2. Upload new avatar image to MinIO (`StorageService.uploadImage`).
    3. Persist new `avatarUrl` in MongoDB.
    4. Call `StorageService.deleteFile(oldAvatarUrl)` to remove the old asset from the bucket.
  - Third-party / OAuth avatar URLs (e.g. Google OAuth `https://lh3.googleusercontent.com/...`) must be detected and skipped without calling MinIO `DeleteObject`.
  - The deletion step must be non-blocking with graceful error handling (`try-catch` + `logger.warn`), ensuring that any transient storage failure never interrupts or fails the user profile update.
- **Gotcha 10 (NestJS Standalone CLI Context & `tsc` vs `tsx` Decorator Metadata)**:
  - When executing standalone scripts (e.g., Database Seeders or Migrations) outside the HTTP server, tools using esbuild (like `tsx`) omit TypeScript `emitDecoratorMetadata` (`design:paramtypes`), which causes NestJS dependency injection to fail or pass `undefined` to services with injected dependencies.
  - **Resolution**: Utilized Nest CLI's native `--entryFile` parameter: `nest start --entryFile database/seeds/seed`. This runs through TypeScript compiler (`tsc`), cleanly preserves decorator metadata, and allows graceful connection shutdown via `app.close()`.
- **Gotcha 12 (Google OAuth Server-side ID Token Verification & Safe Account Linking)**:
  - Google ID Tokens must always be verified server-side with `google-auth-library` (`OAuth2Client.verifyIdToken({ idToken, audience })`) rather than trusting user profile data sent by the client.
  - The permanent, immutable identifier for Google accounts is the `sub` claim (`googleSub`), rather than `email` which can potentially change.
  - Safe Account Linking: If an existing account registered via email/password matches the Google email, auto-linking is safely allowed ONLY when Google confirms `email_verified === true`.
  - In MongoDB `UserEntity`, `passwordHash` must be optional (`required: false, default: null`) so users registering solely via Google OAuth do not fail schema constraints.
  - In Next.js client, `<GoogleLogin />` component from `@react-oauth/google` must omit ad-hoc props like `locale` to satisfy strict React 19 TypeScript typings.
- **Gotcha 13 (MongoDB partialFilterExpression Cannot Mix with sparse & Email Verification Lifecycle)**:
  - In MongoDB, `{ sparse: true }` cannot be mixed with `partialFilterExpression`. MongoDB throws `MongoServerError: cannot mix "partialFilterExpression" and "sparse" options`. When indexing nullable fields like `googleSub` or `emailVerificationToken`, use `partialFilterExpression: { deletedAt: null, <field>: { $type: "string" } }` exclusively without `sparse: true`.
  - When users register via email/password, accounts must be created with `isEmailVerified: false` and `status: UserStatusEnum.INACTIVE`. Login attempts are rejected with an explicit Vietnamese message until activated.
  - To prevent SMTP setup blocking local development or testing, `MailService` automatically detects missing `GMAIL_APP_PASSWORD` and prints the direct activation link prominently to the terminal console as a fallback.
  - On `/verify-email`, `useVerifyEmailMutation` validates the token, activates `status: ACTIVE`, clears tokens, and immediately generates an authenticated session (tokens + `BroadcastChannel('app_auth_sync')`), redirecting the user straight to the learning dashboard.

---

## 2. Change Log & Bug Fixes

### [2026-10-28] - Phase 2: Email Verification via Gmail Link & Account Activation

- **Share-Lib (`share-lib/`)**:
  - Added `isEmailVerified?: boolean`, `emailVerificationToken?: string | null`, and `emailVerificationExpires?: Date | string | null` to `IUser`.
  - Added `isEmailVerified` to `IUserProfile`.
  - Added `IVerifyEmailPayload`, `IResendVerificationPayload`, and `IRegisterResponse` to `auth.interface.ts`.
  - Compiled and exported updated declaration files.
- **Backend (`backend/`)**:
  - Installed `nodemailer` and `@types/nodemailer`.
  - Configured Gmail SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL`, `FRONTEND_URL`) in `.env.example` and `.env`.
  - Created `MailModule` and `MailService` with responsive HTML template, Gmail SMTP transporter, and prominent terminal fallback when credentials are not yet configured.
  - Updated `UserSchema` with `isEmailVerified`, `emailVerificationToken` (with `select: false` and partial index), and `emailVerificationExpires` (with `select: false`).
  - Added `findByVerificationToken` to `UserRepository` and `UserService` with explicit field inclusion (`+emailVerificationToken +emailVerificationExpires`).
  - Updated `LocalAuthService.validateUser` to block login with clear error if `isEmailVerified === false`.
  - Updated `AuthService.register` to create unverified accounts, generate 32-byte crypto token (24h expiry), send email, and return `IRegisterResponse`.
  - Implemented `AuthService.verifyEmail` (activating account, clearing token, generating session) and `AuthService.resendVerification`.
  - Updated `AuthService.loginWithGoogle` to automatically set `isEmailVerified: true` and activate account on linking.
  - Added endpoints `POST /auth/verify-email` and `POST /auth/resend-verification` in `AuthController`.
  - Extended unit tests in `auth.service.spec.ts` covering verification success, expired token, invalid token, and resend scenarios. All 568 backend tests pass 100%.
- **Frontend (`frontend/`)**:
  - Added `verifyEmail`, `resendVerification`, `useVerifyEmailMutation`, and `useResendVerificationMutation` to `frontend/src/features/auth/api/auth.api.ts`.
  - Updated `RegisterForm` to display a dedicated "Kiểm Tra Email Của Bạn" state upon submission with 60s resend cooldown.
  - Implemented `/verify-email` page (`frontend/src/app/(auth)/verify-email/page.tsx`) with Suspense wrapper and comprehensive states (verifying spinner, success with auto-login, expired/invalid token with resend form).
  - Verified Next.js build passes with exit code 0.

### [2026-10-27] - Google OAuth 2.0 Integration (Phase 1)

- **Share-Lib (`share-lib/`)**:
  - Updated `IUser` and `IUserProfile` to support `googleSub?: string | null` and nullable `passwordHash`.
  - Added `IGoogleAuthPayload` interface.
  - Compiled and exported updated `.d.ts`.
- **Backend (`backend/`)**:
  - Installed `google-auth-library` for cryptographic server-side JWT verification.
  - Added `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `backend/.env`.
  - Updated `UserEntity` in `user.schema.ts` with `googleSub` partial unique index `{ deletedAt: null, googleSub: { $type: "string" } }` and nullable `passwordHash`.
  - Added `findByGoogleSub` method to `UserRepository` and `UserService`.
  - Created `GoogleAuthDto` with `class-validator` and `@Transform` string trimming.
  - Implemented `AuthService.loginWithGoogle(dto: GoogleAuthDto)`:
    - Cryptographic verification with `OAuth2Client.verifyIdToken`.
    - Safe Account Linking (Option B) for verified emails.
    - Role preservation (`ADMIN`, `INSTRUCTOR`, `STUDENT`).
    - Account active status verification (`UserStatusEnum.ACTIVE`).
    - Standard session creation and token generation with 30s Grace Period.
  - Added `POST /api/v1/auth/google` endpoint to `AuthController`.
  - Added 7 unit test scenarios in `auth.service.spec.ts` (15/15 tests passing 100%).
- **Frontend (`frontend/`)**:
  - Installed `@react-oauth/google`.
  - Added `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to `frontend/.env`.
  - Wrapped `AppProviders` with `<GoogleOAuthProvider>`.
  - Added `loginWithGoogle` and `useGoogleAuthMutation` with `BroadcastChannel('app_auth_sync')` multi-tab synchronization.
  - Built `GoogleLoginButton` component with Google Identity Services Popup mode, loading indicators, and error toasts.
  - Added divider and `GoogleLoginButton` to `/login` (`LoginForm`) and `/register` (`RegisterForm`).
  - Verified `pnpm --filter frontend run build` passes with 0 errors across all routes.

### [2026-10-07] - Custom Select UI Component, CreatedAt Column, URL-based Database Sorting & Default Newest

- **Custom Select UI Component (`frontend/src/components/ui/select.tsx`)**:
  - Implemented modern, accessible Select primitives based on `@base-ui/react/select`: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectSeparator`.
  - Replaced all raw HTML `<select>` occurrences:
    - Upgraded `FormSelect` and added `FormDropdown` controller supporting both React Hook Form and standalone usage with icons and clean popover styling.
    - Upgraded `DataTablePagination` page size selector (`10, 20, 50`).
    - Upgraded `SectionLessonCreateForm` lesson content type picker.
- **Table CreatedAt Column & Formatting (`frontend/src/features/admin/users/columns.tsx`)**:
  - Added `createdAt` column with calendar icon, localized date-time formatting (`dd/MM/yyyy HH:mm`).
- **Database Sorting (`allowSorting`) & Default Newest**:
  - Added `allowSorting` prop to `DataTableColumnHeader` to enable or disable column sorting.
  - Upgraded `useDataTableUrlState` to manage sorting state, synchronizing with URL search parameters (`?sort=...`).
  - Set default sorting to newest first (`createdAt:desc`), sending `{ createdAt: -1 }` to MongoDB.
  - Enhanced backend `PaginationParamsDto` to support both JSON format and colon format (`createdAt:desc`).
  - Passed `sortParam` through `useAdminUsersQuery` and `usersAdminApi` down to database query pipeline.
- **Fix Popover & Filter Dropdown Clipping Under Table Header**:
  - `PopoverPositioner` was missing `className="z-50"` on its wrapper element, causing popped menus from table toolbar filters to fall behind sticky `TableHeader` (`z-10`).
  - Added `className="z-50"` to `PopoverPositioner`, lowered `TableHeader` sticky z-index to `z-1`, and gave `DataTableToolbar` a stacking context of `relative z-20`, completely resolving clipping issues.
- **Quality & Verification**:
  - 100% test pass rate across 32 test suites (**391/391 tests passed**).
  - `pnpm --filter frontend exec tsc --noEmit`: 0 errors.
  - `pnpm --filter frontend lint`: 0 errors, 0 warnings.


### [2026-10-07] - Admin User Details, Dirty Form Header Save, ReturnUrl State Preservation & Shared Form Fields

- **Backend API & Service (`backend/src/modules/user/`)**:
  - Implemented `getUserDetail(userId: string)` and `updateUserAdmin(userId: string, dto: UpdateUserAdminDto)` in `UserService`.
  - Added endpoints in `UserController` with `@Roles(RoleEnum.ADMIN)`:
    - `GET /users/:id`: Lấy thông tin chi tiết một tài khoản người dùng theo ID.
    - `PATCH /users/:id`: Cập nhật vai trò, họ tên, username, bio, trạng thái của người dùng.
    - `DELETE /users/:id`: Xóa mềm tài khoản người dùng.
  - Re-mapped `toUserProfile` to include `createdAt` and `updatedAt`.
  - Added unit test cases for admin operations. 100% test pass rate across 32 test suites (**391/391 unit tests passed**).
- **Shared Form Field Controllers (`frontend/src/components/shared/form-fields/`)**:
  - Built unified, consistent form controller components integrating `react-hook-form`:
    - `FormInput`: Tự động trim whitespace khi blur, hỗ trợ start/end icons, chạy được cả trong React Hook Form (`control`) lẫn standalone mode (`value`, `onChange`).
    - `FormTextarea`: Tự động trim whitespace, hỗ trợ đếm số lượng ký tự (`maxLength`, `showCount`).
    - `FormSelect`: Dropdown chọn vai trò, trạng thái với icons đồng bộ.
    - `FormSwitch` & `FormCheckbox`: Hỗ trợ boolean toggle/checkbox chuẩn hóa.
    - `FormLabel` & `FormErrorMessage`: Hiển thị nhãn bắt buộc `*` và thông báo lỗi validation.
- **Shared Dialogs (`frontend/src/components/shared/dialog/`)**:
  - `DialogLayout`: Header với icon, tiêu đề, mô tả, nội dung cuộn linh hoạt và footer actions.
  - `DeleteConfirmDialog`: Cảnh báo trực quan cho thao tác xóa người dùng với loading state và xác nhận an toàn.
- **Admin User Table & Row Actions (`frontend/src/features/admin/users/`)**:
  - `UsersTableRowActions`:
    - Xem chi tiết: Tự động mã hóa toàn bộ search params hiện tại (`?page=...&role=...&search=...`) thành `returnUrl` và điều hướng tới `/admin/users/[userId]?returnUrl=...`.
    - Đổi vai trò: Kích hoạt `UserRoleDialog`.
    - Đổi trạng thái: Kích hoạt `UserStatusDialog`.
    - Xóa người dùng: Kích hoạt `DeleteConfirmDialog` kết nối với `useDeleteUserAdminMutation`.
  - `columns.tsx`: Cột tên người dùng và avatar cũng có thể nhấp để xem chi tiết kèm `returnUrl`.
- **Admin User Details Page & View (`frontend/src/app/(admin)/admin/users/[userId]/page.tsx`)**:
  - Route page với React 19 / Next.js 16 async params (`await params`).
  - `UserDetailsView`:
    - **Cơ chế giữ params**: Đọc `returnUrl` từ `useSearchParams()` và nút "Quay lại" trên Header điều hướng về `returnUrl` (giữ nguyên vẹn 100% trang, bộ lọc và từ khóa tìm kiếm trước đó).
    - **Nút Lưu ở phía trên (Header Action Bar)**: Gắn `form="user-detail-form"`, **chỉ able (enabled)** khi `formState.isDirty` (`disabled={!isDirty || isSaving}`).
    - Badge cảnh báo "Chưa lưu thay đổi" (pulse animation) và nút "Hoàn tác" tự động xuất hiện khi form có thay đổi.
    - Cột thông tin hồ sơ: Avatar chữ cái, email, ID người dùng (kèm nút copy), ngày tạo, ngày cập nhật.
    - Form chỉnh sửa: Sử dụng Zod schema `updateUserAdminSchema` validate `fullName`, `username`, `bio`, `role`, `status`. Sau khi submit thành công, `reset()` cập nhật dữ liệu mới và đưa `isDirty` về `false`, tự động disable lại nút Save.
- **Quality & Verification**:
  - `pnpm --filter frontend exec tsc --noEmit`: 0 errors.
  - `pnpm --filter frontend lint`: 0 errors, 0 warnings.
  - Strictly Zero `any` in TypeScript.



### [2026-10-07] - Modular User Database Seeding & Idempotency CLI Implementation

- **Domain Seeder Architecture (`backend/src/modules/user/seeds/`)**:
  - `user.seed.data.ts`: Standardized seed dataset covering all system roles:
    - 1 Admin (`admin@thc.edu.vn`)
    - 3 Instructors (`instructor1@thc.edu.vn`, `instructor2@thc.edu.vn`, `instructor3@thc.edu.vn`)
    - 3 Students (`student1@thc.edu.vn`, `student2@thc.edu.vn`, `student3@thc.edu.vn`)
    - Shared default password: `Password123@`.
  - `user.seeder.ts`: Service implementing `ISeeder` interface, injecting `UserRepository` (Repository Pattern compliance).
    - Idempotency: Checks `findByEmail` before insertion; logs `[SKIP]` if the user already exists.
    - Soft-delete recovery: Automatically calls `restore` before updating if a seed user was previously soft-deleted.
    - Support for `--refresh` / `--reset` flag: Resets user profile fields, restores active status, and re-hashes password via `bcrypt`.
- **Database CLI Runner (`backend/src/database/seeds/`)**:
  - `seeder.interface.ts`: Standard `ISeeder` contract with `run(options?: ISeederOptions): Promise<void>`.
  - `seed.module.ts`: Standalone Nest module importing `ConfigModule`, `MongooseModule`, and domain modules (`UserModule`).
  - `seed.ts`: Standalone CLI runner using `NestFactory.createApplicationContext` with graceful exit.
- **Single Command Orchestration**:
  - Root `package.json`: `"seed": "pnpm --filter backend seed"` and `"seed:refresh": "pnpm --filter backend seed:refresh"`.
  - Backend `package.json`: `"seed": "nest start --entryFile database/seeds/seed"` and `"seed:refresh": "nest start --entryFile database/seeds/seed -- --refresh"`.
- **Testing & Verification**:
  - Created unit test suite `user.seeder.spec.ts` covering initial seed, skip on duplicate, refresh mode, and soft-delete restoration (5/5 tests pass).
  - Whole test suite passed (386/386 tests across 32 files). Lint and type check completely clean.

### [2026-10-03] - MinIO Old Avatar Deletion & Storage Cleanup Workflow

- **Backend (`UserService.updateAvatar`)**:
  - Implemented 5-step safe avatar replacement flow:
    1. Query current user profile with `findByIdOrFail` to obtain `oldAvatarUrl`.
    2. Upload new cropped/compressed avatar via `StorageService.uploadImage(file, 'avatars')`.
    3. Update user document in MongoDB with new `avatarUrl`.
    4. Clean up old avatar from MinIO via `StorageService.deleteFile(oldAvatarUrl)` with `try-catch` fault-tolerance.
    5. Return updated user profile.
- **Storage Infrastructure (`StorageService.deleteFile`)**:
  - Improved `deleteFile` to cleanly strip both public URL prefix and `/thc-datn-media/` bucket prefix.
  - Automatically filters external URLs (e.g. Google OAuth avatars `https://lh3.googleusercontent.com/...`), skipping unnecessary S3 DeleteObject requests and returning `false`.
- **Frontend UI Polish (`AvatarUploader`)**:
  - Removed remaining "Cloudinary" references in tooltip and guideline text, replaced with "MinIO Storage".
- **Testing & Verification**:
  - Added test cases in `user.service.avatar.spec.ts` and `storage.service.spec.ts` covering old avatar deletion, null avatar upload, Google OAuth avatar skipping, and storage error resilience.
  - 100% tests pass (19/19 tests) with 0 TypeScript compilation errors.

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

### [2026-10-28] - Right Panel Minimal Full-Bleed Crossfade Hero Image (All 4 Images, 50/50 Split)

- **Context & Objective**:
  - Redesigned the right panel into a minimal, full-bleed hero artwork showcase (`w-full h-full object-cover`), removing all decorative headers, descriptions, badges, complex controls, and bordered boxes per user specification and `/design-taste-frontend` rules.
- **Frontend Architecture & Crossfade Mechanics**:
  - `AuthShowcaseCarousel` (`frontend/src/features/auth/components/auth-showcase-carousel.tsx`):
    - Full-bleed presentation: 100% width & height (`w-full h-full object-cover object-center`), occupying entire 50% screen width on Desktop (`lg:w-1/2` in `grid grid-cols-1 lg:grid-cols-2`).
    - 4-image crossfade loop: Smooth opacity fade transition (`transition-opacity duration-1000 ease-in-out`) between all 4 artworks (`panel-1.jpg`, `panel-2.jpg`, `panel-3.jpg`, `panel-4.jpg`).
    - Autoplay interval: 5.5s (between 5-6s) with pause-on-hover/focus.
    - Minimalist indicators: 4 ultra-clean subtle pill dots (`absolute bottom-6 left-1/2 -translate-x-1/2`) with tablist accessibility roles.
    - Zero redundant text: Completely removed DATN Portal header, ART tag, online status pill, category badges, headlines, and descriptions.
  - `AuthLayout` (`frontend/src/app/(auth)/layout.tsx`):
    - Desktop: Clean 50/50 split via `grid grid-cols-1 lg:grid-cols-2`.
    - Left column: Auth form preserved cleanly (`w-full min-h-screen flex flex-col justify-between ...`).
    - Mobile & Tablet (< 1024px): Right image column is completely hidden (`hidden lg:block`), dedicating full viewport to Auth Form.
- **Verification & Gates**:
  - Ran `audit-ui.mjs` on `src/features/auth` and `src/app/(auth)`: 0 violations across 19 files.
  - Updated unit test suite `auth-showcase-and-schema.spec.ts` testing 4-image crossfade and 5.5s interval; 8/8 tests pass 100%.

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


### [2026-10-28] - Streamline Auth UI (Register & Login Redesign)

- **Registration Form Streamlining (`frontend/src/features/auth/`)**:
  - Removed explicit `firstName` and `lastName` input fields from the registration flow as per user preference for a frictionless sign-up experience.
  - Updated `registerSchema` to solely validate `email`, `password`, and `confirmPassword`.
  - Backend already handles missing names by defaulting `fullName` to the email username (`email.split('@')[0]`), and users can customize their name later via `/profile`.
- **UI/UX Polishing (`design-taste-frontend` / `frontend-specialist`)**:
  - Completely removed redundant legal disclaimer line from `AuthLayout` footer.
  - Streamlined `AuthTopNav` by keeping only the sleek `← Về trang chủ` link, eliminating duplicated "Đăng nhập / Đăng ký" action from the top header.
  - Centered auth card container seamlessly in the viewport with optimized `max-w-[400px]`, rounded-xl inputs, high-contrast typography, and single switch link under the card footer.
  - Retained 50/50 responsive split showcase on wide desktop displays (`lg:` breakpoint) with graceful centered single column on mobile and tablet.
  - Unit tests updated and verified 100% passing (8/8 tests).
