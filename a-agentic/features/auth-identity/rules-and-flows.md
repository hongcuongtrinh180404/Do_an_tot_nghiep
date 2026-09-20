# Authentication & Identity — Rules & Business Flows

> **Module:** User Authentication, Local Email/Password Login, User Management, Basic Role Authorization

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
