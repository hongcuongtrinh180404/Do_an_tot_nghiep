# Authentication & Identity — Technical Specification

> **Description:** Database Schemas (MongoDB Collections), JWT Payload Specs, and REST API Contracts for Auth & Identity with Basic Role-Based Access Control (`ADMIN`, `USER`), OAuth extensibility, email verification, and password reset.

---

## 1. Database Collections (MongoDB)

### Collection: `users`

- `_id`: `ObjectId` (PK)
- `email`: `string` (Required, unique lowercase, partialFilterExpression: `{ deletedAt: null }`)
- `passwordHash`: `string` (Optional for Google-only accounts, bcrypt hashed password, `select: false` by default)
- `googleSub`: `string | null` (Verified Google identity; a linked, active, email-verified account may create its first local password through the reset-email flow)
- `fullName`: `string` (Required, trimmed)
- `username`: `string` (Optional, unique lowercase, sparse partialFilterExpression: `{ deletedAt: null, username: { $type: "string" } }`)
- `avatarUrl`: `string` (Optional, Cloudinary URL)
- `bio`: `string` (Optional, short biography)
- `role`: `enum` (`student`, `instructor`, `admin` - default: `student`, indexed)
- `status`: `enum` (`active`, `inactive`, `banned` - default: `active`, indexed)
- `isEmailVerified`: `boolean` (default: `false`, indexed)
- `emailVerificationToken`: `string` (Optional, `select: false`, partial index)
- `emailVerificationExpires`: `Date` (Optional, `select: false`)
- `passwordResetTokenHash`: `string` (Optional, SHA-256 hash of the reset token, `select: false`, partial index `{ deletedAt: null, passwordResetTokenHash: { $type: "string" } }`)
- `passwordResetExpires`: `Date` (Optional, 15-minute expiry, `select: false`; **no TTL index**)
- `passwordResetRequestedAt`: `Date` (Optional, last reset request timestamp for the 60-second account cooldown, `select: false`)
- Audit & Timestamp fields: `createdAt`, `updatedAt` (Mongoose timestamps), `deletedAt` (Date, indexed), `createdById`, `updatedById`

### Collection: `sessions`

- `_id`: `ObjectId` (PK)
- `userId`: `string` (Index -> `users._id`)
- `refreshTokenHash`: `string` (SHA-256 hash of active refresh token)
- `previousRefreshTokenHash`: `string` (Optional, SHA-256 hash of previous token for 30s Grace Period)
- `hashRotatedAt`: `Date` (Timestamp when hash was rotated)
- `expiresAt`: `Date` (TTL Index - auto-expires old session documents)
- `isRevoked`: `boolean` (default: `false`)
- Audit fields: `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`

### Token TTL Specifications

- `ACCESS_TOKEN_EXPIRES_IN`: `15m` (Access Token)
- `REFRESH_TOKEN_EXPIRES_IN`: `7d` (Refresh Token)
- `SESSION_GRACE_PERIOD_MS`: `30000` (30 seconds window for concurrent refresh requests across multiple tabs)
- `PASSWORD_RESET_TOKEN_TTL_MS`: `900000` (15 minutes, single-use password reset link)
- `PASSWORD_RESET_COOLDOWN_MS`: `60000` (60 seconds between reset requests per account)

---

## 2. API Endpoints

| Method | Endpoint         | Authorization           | Description                                                        |
| :----- | :--------------- | :---------------------- | :----------------------------------------------------------------- |
| `POST` | `/auth/register` | Public                  | Register new user account with email/password                     |
| `POST` | `/auth/login`    | Public                  | Local email/password login, returns access + refresh tokens        |
| `POST` | `/auth/refresh`  | Public (Refresh Token)  | Refresh JWT tokens with 30-second Session Grace Period             |
| `POST` | `/auth/logout`   | Authenticated           | Revoke all active user sessions and logout                        |
| `GET`  | `/auth/me`       | Authenticated           | Retrieve currently logged-in user profile & role                  |
| `POST` | `/auth/forgot-password` | Public (5 req / 15 min / IP) | Request a password reset email; always returns the generic message |
| `POST` | `/auth/reset-password`  | Public (10 req / 15 min / IP) | Consume a single-use token to create or replace a Mindly password |

---

## 3. Password Reset Contract

### 3.1. Forgot Password

**Endpoint:** `POST /auth/forgot-password` (Public, 5 requests / 15 minutes / IP)

Endpoint paths in this document are relative to `API_PREFIX` (default `api/v1`); the default full path is `/api/v1/auth/forgot-password`.

**DTO:** `ForgotPasswordDto`

```ts
{
  email: string; // required, valid email, lowercased & trimmed
}
```

**Success response (HTTP 200):**

```json
{
  "success": true,
  "message": "Nếu email đã được đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.",
  "data": {
    "message": "Nếu email đã được đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."
  },
  "timestamp": "2026-10-30T00:00:00.000Z"
}
```

The same response is returned for every account state (missing, inactive, unverified, local, Google-only, cooldown, SMTP failure) to prevent email enumeration. Eligible accounts require `status: active`, `deletedAt: null`, `isEmailVerified: true` and **either** a non-empty `passwordHash` **or** a non-blank `googleSub`. A Google-only account now receives a link to create its first Mindly password.

The success envelope follows `backend/src/modules/base/dto/api-response.dto.ts`; `timestamp` is generated at runtime, and HTTP status is not a `statusCode` field in this success body. Invalid DTOs may return HTTP `400`; throttling may return `429`. The generic response is not a guarantee for infrastructure failures such as a database error, nor proof of email delivery.

**Rate limit response:** HTTP `429` with `AUTH_CONSTANTS.PASSWORD_RESET_RATE_LIMIT_MESSAGE`.

### 3.2. Reset Password

**Endpoint:** `POST /auth/reset-password` (Public, 10 requests / 15 minutes / IP)

**DTO:** `ResetPasswordDto`

```ts
{
  token: string;    // exactly 64 hex characters
  password: string; // min 6 characters, trimmed
}
```

**Success response (HTTP 200):**

```json
{
  "success": true,
  "message": "Thiết lập mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
  "data": {
    "message": "Thiết lập mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."
  },
  "timestamp": "2026-10-30T00:00:00.000Z"
}
```

**Invalid / expired / already-used token:** HTTP `400` with `AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE`.

Malformed/missing token or invalid password is rejected by DTO validation first and may have field-specific messages. `confirmPassword` is client-only: submit only `token` and `password`; the global validation pipe rejects extra fields.

### 3.3. Token & Security Rules

- Raw token: `crypto.randomBytes(32).toString('hex')` (64 hex characters).
- Stored value: SHA-256 hash only (`passwordResetTokenHash`).
- TTL: 15 minutes (`passwordResetExpires`).
- Single-use: atomic `findOneAndUpdate` clears the hash only if it still matches, is unexpired, and the account remains active/verified.
- A new request overwrites the previous token; the old link becomes invalid.
- Account cooldown: 60 seconds (`passwordResetRequestedAt`); requests inside the window are silently ignored with the generic response.
- Atomic request claim combines `(local password OR Google identity)` AND the cooldown condition. Updating the service eligibility check alone is insufficient because the repository applies its own eligibility filter.
- Reset page does not consume the token on load; consumption happens only on form submit.
- On success, all user sessions are revoked inside the same transaction.
- For Google-only accounts, the transaction sets the first `passwordHash` on the existing user and preserves `googleSub`, user ID and role. Google and local-password login remain available on that same account; merely requesting the link does not create a password.
- SMTP failure rolls back the token and cooldown fields, logs server-side, and still returns the generic HTTP 200 response.
- Rollback matches the failed request's token hash, does not clear a newer token, and does not restore the previously overwritten link. The UI still waits 60 seconds before resend; IP throttling still applies.
- No TTL index is defined on `passwordResetExpires` because MongoDB TTL would delete the whole user document.

### 3.4. Deployment Requirements & Known Limits

- Reset completion requires MongoDB transactions (replica set or sharded cluster), not a standalone MongoDB server.
- Missing Gmail credentials currently triggers a terminal fallback: the full reset URL is logged and `sendPasswordResetEmail` returns `true`, retaining token/cooldown. This branch is not gated by `NODE_ENV`; it is a known production security gap, not a safe production fallback.
- `THROTTLE_TTL` / `THROTTLE_LIMIT` are numeric module defaults; route decorators override them with the limits above. `ThrottlerGuard` is applied only to the two password-reset endpoints, and its default storage is per-instance memory.
- Verify trusted-proxy/IP handling before deployment behind a reverse proxy (`main.ts` does not currently configure `trust proxy`). Multi-instance deployments need a shared throttling strategy if a cluster-wide limit is required.
- Generic status/message does not equal timing-side-channel protection: eligible requests await SMTP, while ineligible requests return earlier.
- Automated verification includes 17 reset-service unit tests and 11 real-MongoDB integration tests for Google password setup (Google verification/mail mocked). Results and the still-unrun browser/real-mail E2E checklist are recorded in [PLAN-forgot-password.md](../../../docs/PLAN-forgot-password.md).

---

## 4. Extensible OAuth Strategy Hook

The `AuthService.validateOAuthLogin()` method provides a standardized integration hook for future OAuth providers (Google, GitHub):
- Matches existing user by `(provider, providerId)`.
- If user exists with matching email, securely links the provider.
- If new user, creates active account with `provider` and default `RoleEnum.USER`.
- Automatically issues JWT tokens and registers session.
