# Base Abstract & Audit Field — Development History & Gotchas

> **Description:** Issue logs, resolution history, and architectural gotchas for Base Document & Audit infrastructure.

---

## 1. Important Gotchas & Architectural Pitfalls

- **Gotcha 1 (AsyncLocalStorage Context Loss in Detached Promises)**:
  - When spawning unawaited promises or background timers, the AsyncLocalStorage request context may be lost. If an audit write occurs in a background worker or cron job, `BaseService` must safely fall back to `'SYSTEM'` instead of throwing a null reference exception.
- **Gotcha 2 (Soft Delete Unique Constraints)**:
  - If a collection has a unique index (e.g. `email`), soft deleting a document with `deletedAt = new Date()` still keeps the record in MongoDB. A subsequent insert with the same `email` will trigger a duplicate key error (`E11000`) unless the unique index is partial:
    ```typescript
    UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
    ```
- **Gotcha 3 (MongoDB Session Leak in withTransaction)**:
  - Always ensure `session.endSession()` is invoked in a `finally` block if manually managing sessions, or use a managed transaction runner to avoid leaking connection pool resources.

---

## 2. Change Log & Bug Fixes

### [2026-09-20] - Feature Context Created

- **Base Architecture Established**: Defined `BaseAbstractDocument`, `BaseRepository`, `BaseMongoRepository`, and `BaseService` contracts for NestJS + MongoDB (Mongoose).
- **Audit Field Standardization**: Mandated automatic capture of `createdAt`, `updatedAt`, `deletedAt`, `createdById`, and `updatedById`.
- **Soft Deletion Protocol**: Documented default active filtering (`deletedAt: null`) and partial unique index requirements.
