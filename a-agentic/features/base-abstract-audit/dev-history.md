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
- **Gotcha 4 (Mongoose 9 ClientSession Typing)**:
  - In Mongoose 9, query/mutation options strictly enforce `session?: ClientSession | undefined` instead of `ClientSession | null`. Conditionally pass `{ session }` or use `session ?? undefined`.
- **Gotcha 5 (Crypto randomUUID Typing in ESM)**:
  - Node `crypto.randomUUID()` returns a template literal UUID string type (`${string}-${string}...`). Explicitly annotate variables as `string` when they may also be assigned from HTTP headers.

---

## 2. Change Log & Bug Fixes

### [2026-09-20] - Base Architecture Implemented in `backend/src/modules/base`

- **Implementation Complete**: Built the full base foundation layer for NestJS + MongoDB in `backend/src/modules/base/`.
- **Documents & Schemas**: Implemented `BaseAbstractDocument` Mongoose schema with `_id: Types.ObjectId`, timestamps, soft-delete, and audit fields (`createdById`, `updatedById`).
- **Domain Repositories**: Implemented `BaseRepository<DomainModel, ID>` interface and generic `BaseMongoRepository` with active record filtering (`deletedAt: null`), pagination calculations (`PaginationResult`), and MongoDB session transactions.
- **Base Services & Audit Context**: Implemented `BaseService` with `ClsService` integration to auto-inject audit fields, structured logging, and standard error handling.
- **Interceptors & DTOs**:
  - `AuditContextInterceptor` extracting `userId` and `correlationId` into CLS.
  - `TransformInterceptor` standardizing HTTP responses into `ApiResponse<T>`.
  - `PaginationParamsDto` with automatic whitespace trimming via `@Transform`.
- **Testing**: Added unit test suites for `BaseMongoRepository` and `BaseService` using Vitest and AAA pattern; 17/17 tests passing with 0 errors.

### [2026-09-20] - Feature Context Created

- **Base Architecture Established**: Defined `BaseAbstractDocument`, `BaseRepository`, `BaseMongoRepository`, and `BaseService` contracts for NestJS + MongoDB (Mongoose).
- **Audit Field Standardization**: Mandated automatic capture of `createdAt`, `updatedAt`, `deletedAt`, `createdById`, and `updatedById`.
- **Soft Deletion Protocol**: Documented default active filtering (`deletedAt: null`) and partial unique index requirements.
