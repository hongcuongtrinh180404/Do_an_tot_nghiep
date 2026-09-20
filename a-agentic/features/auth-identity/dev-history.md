# Authentication & Identity — Development History & Gotchas

> **Description:** Issue logs, resolution history, and architectural gotchas for Auth & Identity.

---

## 1. Important Gotchas & Architectural Pitfalls

- **Gotcha 1 (Super Admin Bypass Guard)**:
  - When evaluating roles in `RolesGuard`, always check if the user has the `SUPER_ADMIN` role first to bypass explicit role requirements.
- **Gotcha 2 (Multi-Tab Refresh Race Condition & 30s Grace Period)**:
  - When multiple tabs refresh simultaneously, strict single-use hash rotation causes the losing tab to get a 401 error, which can wipe cookies and kill the winning tab's session. Mitigated with dual layers: Frontend Web Locks API (`navigator.locks.request('token_refresh')`) and Backend 30-second Session Grace Period (`previousHash` & `hashRotatedAt`).
- **Gotcha 3 (Ghost User Persistence & Bootstrap Verification)**:
  - `localStorage` user profile never expires by default. If the user doesn't visit for a long time, or their account is deleted/disabled, opening the client previously loaded stale credentials into the UI without server check. Solved by: purging cached user state when token cookies are absent, and enforcing `/auth/me` bootstrap check upon app initialization.

---

## 2. Change Log & Bug Fixes

### [2026-09-20] - Clean Feature Specification Initialized

- **Module Initialization**: Created clean specification for Authentication & Identity tailored for NestJS + MongoDB (Mongoose) and Next.js App Router.
- **Removed Legacy Integrations**: Completely stripped legacy LDAP, Azure AD SSO, and relational SQL tables from documentation.
- **Clean State**: Ready for feature implementation with local email/password login, JWT tokens, 30s session grace period, and basic role-based access control (`SUPER_ADMIN`, `ADMIN`, `USER`).
