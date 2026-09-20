# Authentication & Identity — Technical Specification

> **Description:** Database Schemas (MongoDB Collections), JWT Payload Specs, and REST API Contracts for Auth & Identity with Basic Role-Based Access Control.

---

## 1. Database Collections (MongoDB)

### Collection: `users`

- `_id`: `ObjectId` (PK)
- `email`: `string` (Unique Index, lowercase, trimmed)
- `password`: `string` (bcrypt hashed password)
- `firstName`: `string` (trimmed)
- `lastName`: `string` (trimmed)
- `role`: `enum` (`SUPER_ADMIN`, `ADMIN`, `USER` - default: `USER`)
- `status`: `enum` (`ACTIVE`, `INACTIVE`, `SUSPENDED` - default: `ACTIVE`)
- Audit fields: `createdAt`, `updatedAt`, `deletedAt` (Date, indexed), `createdById`, `updatedById`

### Collection: `sessions`

- `_id`: `ObjectId` (PK)
- `userId`: `ObjectId` (Index -> `users._id`)
- `hash`: `string` (active refresh token hash)
- `previousHash`: `string` (Nullable, Index - for 30s grace period)
- `hashRotatedAt`: `Date` (Nullable - timestamp when hash was rotated)
- `expireAt`: `Date` (TTL Index - auto-expires old session documents)
- `isDeleted`: `boolean`
- Audit fields: `createdAt`, `updatedAt`, `deletedAt`

### Token TTL Specifications

- `AUTH_JWT_TOKEN_EXPIRES_IN`: `15m` (Access Token)
- `AUTH_REFRESH_TOKEN_EXPIRES_IN`: `7d` (Refresh Token, aligned with browser cookie max-age)
- Session Grace Period: `30s` (allowed reuse of previousHash during concurrent refreshes)

---

## 2. API Endpoints

| Method | Endpoint                   | Authorization           | Description                                    |
| :----- | :------------------------- | :---------------------- | :--------------------------------------------- |
| `POST` | `/api/v1/auth/login`       | Public                  | Local email/password login                     |
| `POST` | `/api/v1/auth/logout`      | Authenticated           | Invalidate current user session & tokens       |
| `POST` | `/api/v1/auth/refresh`     | Public (Bearer Refresh) | Refresh JWT Access Token with 30s grace period |
| `GET`  | `/api/v1/auth/me`          | Authenticated           | Retrieve current user profile & role           |
| `GET`  | `/api/v1/users`            | Roles: `ADMIN`          | List system users with pagination              |
| `POST` | `/api/v1/users`            | Roles: `ADMIN`          | Create new system user                         |
| `GET`  | `/api/v1/users/:id`        | Roles: `ADMIN`          | Get user detail by ID                          |
| `PATCH`| `/api/v1/users/:id`        | Roles: `ADMIN`          | Update user information                        |
| `DELETE`| `/api/v1/users/:id`       | Roles: `ADMIN`          | Soft delete user and terminate active sessions |
