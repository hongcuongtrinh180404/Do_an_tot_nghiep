# Authentication & Identity — Technical Specification

> **Description:** Database Schemas (MongoDB Collections), JWT Payload Specs, and REST API Contracts for Auth & Identity with Basic Role-Based Access Control (`ADMIN`, `USER`) and OAuth extensibility.

---

## 1. Database Collections (MongoDB)

### Collection: `users`

- `_id`: `ObjectId` (PK)
- `email`: `string` (Unique compound index with `deletedAt`, lowercase, trimmed)
- `password`: `string` (bcrypt hashed password, `select: false` by default)
- `firstName`: `string` (Optional, trimmed)
- `lastName`: `string` (Optional, trimmed)
- `avatar`: `string` (Optional)
- `role`: `enum` (`ADMIN`, `USER` - default: `USER`)
- `status`: `enum` (`ACTIVE`, `INACTIVE`, `SUSPENDED` - default: `ACTIVE`)
- `provider`: `enum` (`LOCAL`, `GOOGLE`, `GITHUB` - default: `LOCAL`)
- `providerId`: `string` (Optional, indexed with `provider` for third-party OAuth accounts)
- Audit fields: `createdAt`, `updatedAt`, `deletedAt` (Date, indexed), `createdById`, `updatedById`

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

---

## 2. API Endpoints

| Method | Endpoint         | Authorization           | Description                                                        |
| :----- | :--------------- | :---------------------- | :----------------------------------------------------------------- |
| `POST` | `/auth/register` | Public                  | Register new user account with email/password                     |
| `POST` | `/auth/login`    | Public                  | Local email/password login, returns access + refresh tokens        |
| `POST` | `/auth/refresh`  | Public (Refresh Token)  | Refresh JWT tokens with 30-second Session Grace Period             |
| `POST` | `/auth/logout`   | Authenticated           | Revoke all active user sessions and logout                        |
| `GET`  | `/auth/me`       | Authenticated           | Retrieve currently logged-in user profile & role                  |

---

## 3. Extensible OAuth Strategy Hook

The `AuthService.validateOAuthLogin()` method provides a standardized integration hook for future OAuth providers (Google, GitHub):
- Matches existing user by `(provider, providerId)`.
- If user exists with matching email, securely links the provider.
- If new user, creates active account with `provider` and default `RoleEnum.USER`.
- Automatically issues JWT tokens and registers session.
