# Authentication & Identity — Rules & Business Flows

> **Module:** User Authentication, Local Email/Password Login, Password Reset, User Management, Basic Role Authorization

---

## 1. Business Overview

- **Authentication Method**:
  - **Local Authentication**: Email / Password with bcrypt password hashing, Refresh Token rotation in MongoDB.
  - Password must be hashed before storage and excluded from API responses (`select: false` or DTO transformer).
- **Role-Based Access Control**:
  - Users are assigned a primary role (`SUPER_ADMIN`, `ADMIN`, `USER`).
  - Endpoints and routes are protected by role guards (`@Roles(RoleEnum.ADMIN)`).
  - Super admin / Admin accounts possess bypass permissions for administrative actions.

---

## 2. Multi-Tab Session & Token Security Rules

- **Cross-Tab Synchronization**:
  - Frontend utilizes `BroadcastChannel('app_auth_sync')` and `storage` events to synchronize authentication state across multiple browser tabs.
  - When switching accounts or logging in with a new user in one tab (`AUTH_USER_SWITCHED`), all other tabs update user state, clear query caches, and reload (`window.location.reload()`) to refresh the layout and role state.
  - When logging out (`AUTH_LOGOUT`), all tabs reset store/context and redirect to `/login`.
- **Refresh Token Concurrency & Grace Period**:
  - Frontend uses Web Locks API (`navigator.locks.request('token_refresh')`) so only 1 tab refreshes tokens at any given moment.
  - Backend `SessionRepository.updateByHash` enforces a **30-second Grace Period window** (`hashRotatedAt < 30s`): concurrent requests presenting `previousHash` within 30s receive the active session and tokens instead of 401 Unauthorized.
- **Account Inactivity & Lifecycle**:
  - Refresh token and authentication strictly require `user.status === 'ACTIVE'`.
  - When a user is soft-deleted (`deletedAt != null`) or deactivated (`status !== 'ACTIVE'`), all active user sessions are immediately terminated via `SessionService.deleteByUserId`.
  - Stale user state in `localStorage` is purged on startup if authentication cookies/tokens are absent.

---

## 3. Password Reset Flow (Forgot / Reset Password)

### 3.1. Trigger & UX Rules

- The **“Quên mật khẩu?”** link sits right-aligned directly below the password input on `/login`.
- Clicking it opens a centered modal **without navigating away** from `/login`. The login page remains visible behind a lightly dimmed overlay (`bg-black/10`).
- The modal closes via the **X** button, the **“Hủy”** button, or the **Escape** key.
- The email currently typed in the login form is pre-filled into the modal.
- Empty or malformed emails are blocked client-side before any API call.
- While the request is in flight, the submit button is disabled and shows a loading state.
- Shared copy explains that Google users can create a separate Mindly password through this same modal; it does not disclose the submitted email's account type.

### 3.2. Anti-Enumeration Rules

- The API **must never reveal whether an email exists**.
- For valid, non-throttled requests, the listed account/delivery outcomes return the exact same message (DTO validation and infrastructure failures are not covered by this guarantee):

```text
Nếu email đã được đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.
```

- The generic response is used for:
  - Non-existent email.
  - Soft-deleted, inactive, or banned account.
  - Account whose email is not verified.
  - Eligible Google-only account without a local password (now sends a setup email after a successful claim).
  - Account with neither a local password nor a linked Google identity (no email).
  - Request inside the 60-second cooldown.
  - SMTP delivery failure.
- Never return `404` or a distinct `400` for an unknown email.
- Production requirement: never include raw reset tokens in server logs. **Known gap:** the current missing-SMTP-credentials fallback logs the full reset URL without a `NODE_ENV` guard; see section 3.6.

### 3.3. Eligible Accounts

An account receives a reset email only when **all** conditions hold:

1. `deletedAt === null`.
2. `status === UserStatusEnum.ACTIVE`.
3. `isEmailVerified === true`.
4. Either `passwordHash` is a non-empty string **or** `googleSub` is a non-blank string (verified Google link).

Both service eligibility and the atomic repository claim enforce these rules. The credential alternatives and cooldown alternatives are combined with `$and`; Google linkage never bypasses cooldown or account status checks.

### 3.4. Token Lifecycle

- Generate the raw token with `crypto.randomBytes(32).toString('hex')` (64 hex characters).
- Store only `SHA-256(rawToken)` in `passwordResetTokenHash`.
- The emailed URL is `${FRONTEND_URL}/reset-password?token=...`. The current missing-credentials fallback also logs this full URL; do not treat production token-log protection as complete.
- Token TTL is **15 minutes** (`AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_TTL_MS`).
- Tokens are **single-use**. Consumption uses an atomic `findOneAndUpdate` guarded by:
  - matching `passwordResetTokenHash`,
  - `passwordResetExpires > now`,
  - `deletedAt: null`, `status: ACTIVE`, `isEmailVerified: true`.
- A new reset request **overwrites** the previous token; older links immediately stop working.
- The reset page **does not consume** the token on load. Consumption happens only when the user submits the form, preventing email security scanners from burning the link.

### 3.5. Cooldown & Rate Limiting

- **Per-account cooldown:** 60 seconds between reset requests (`PASSWORD_RESET_COOLDOWN_MS`). Requests inside the window are silently ignored but still receive the generic response.
- **Per-IP throttling** via `@nestjs/throttler`:
  - `POST /auth/forgot-password`: 5 requests / 15 minutes / IP.
  - `POST /auth/reset-password`: 10 requests / 15 minutes / IP.
- Throttled requests return HTTP `429` with `AUTH_CONSTANTS.PASSWORD_RESET_RATE_LIMIT_MESSAGE`.
- These are route-level overrides; `THROTTLE_TTL` / `THROTTLE_LIMIT` only set module defaults. The guard is not global, and its default memory storage is local to each backend instance.
- Closing/reopening the modal resets its client countdown. Backend account cooldown and IP throttling remain authoritative.

### 3.6. Email Delivery Failure

- If SMTP delivery fails, the backend:
  1. Rolls back `passwordResetTokenHash`, `passwordResetExpires`, and `passwordResetRequestedAt`.
  2. Logs the failure server-side (without the raw token).
  3. Returns HTTP `200` with the generic message.
- Rollback clears backend account cooldown only for the matching failed token hash, avoiding deletion of a newer request. It does not restore an earlier overwritten token, and IP throttling still applies.
- The frontend cannot detect SMTP failure from the generic response, so it still shows `sent` with a Spam-folder hint and disables resend for 60 seconds. Immediate API retry is different from immediate UI resend.
- **Missing credentials are not a send failure:** if `GMAIL_USER` or `GMAIL_APP_PASSWORD` is absent, `MailService` currently logs the reset URL and returns `true`; no rollback happens and token/cooldown remain. This branch lacks an environment guard and must be restricted/removed before production use.

### 3.7. Reset Completion

- The new password is hashed with bcrypt via `LocalAuthService.hashPassword`.
- The password update and token clearing happen atomically in a transaction.
- MongoDB must support transactions (replica set or sharded cluster). Verify rollback and concurrent consumption against a real database; service mocks alone do not prove these guarantees.
- **All active sessions of the user are revoked** in the same transaction (`SessionService.revokeAllUserSessions`).
- Success message:

```text
Thiết lập mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.
```

- The frontend clears `accessToken`, `refreshToken`, and `user` from `localStorage`, removes auth query cache, shows a success state, and redirects to `/login` after 3 seconds.

#### Google-only → Google + Mindly Password

- Use the same forgot/reset endpoints and token lifecycle to establish the first local password.
- A request only sends a setup link; it leaves `passwordHash: null` until successful token submission.
- Store the new bcrypt hash on the existing account, retaining `googleSub`, ID and role. The user can sign in via either Google or email/password afterward.
- The reset page and email use neutral “Thiết lập mật khẩu” copy for both initial setup and reset. No separate account-type response or query parameter is introduced.
- `backend/test/auth/password-reset.e2e-spec.ts` verifies this flow against real MongoDB transactions, including dual login, single-use concurrency and rollback; Google token verification and mail delivery are mocked.

### 3.8. Reset Page Security

- `/reset-password` sets `metadata.referrer = 'no-referrer'` to avoid leaking the token through the `Referer` header.
- A missing token on the page, or a well-formed but expired/unknown/already-used token submitted to the service, shows the invalid-link message below. Malformed token payloads may instead produce DTO field-validation messages:

```text
Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
```
