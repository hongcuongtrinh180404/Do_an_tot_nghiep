---
trigger: always_on
---

# Project Architectural Rules (`docs/RULE_GUIDE.md`)

> **CRITICAL:** All code written for this project MUST strictly comply with these architectural rules.

---

## 1. Backend Requirements (NestJS + MongoDB / Mongoose)

- **Documents & Schemas**:
  - All Mongoose schemas MUST inherit or implement `BaseAbstractDocument` (timestamps, soft delete `deletedAt`, audit fields `createdById`, `updatedById`).
- **Services**:
  - All services inherit `BaseService` (CLS context, automated logging, and audit capture).
- **Repositories & Dependency Injection (DI)**:
  - All repositories implement the abstract `BaseRepository<DomainModel, ID>` interface with a concrete `BaseMongoRepository` using Mongoose models.
  - Services MUST inject Abstract Domain Repositories (`BaseRepository<DomainModel, ID>`).
  - ❌ **FORBIDDEN:** Do NOT inject raw Mongoose `@InjectModel(Entity.name)` directly into Services or manipulate database queries/documents directly in Services. All DB access must go through the Repository layer.
  - Module files must import domain persistence modules.
- **Responses & Errors**:
  - All API responses wrapped in standardized `ApiResponse<T>`.
  - All errors encapsulated in standardized HTTP error envelopes (`NotFoundException`, `BadRequestException`, `ForbiddenException`, etc.).
- **Security & Authorization**:
  - **Basic Role-Based Access Control**: Simple role authorization using `@Roles('ADMIN', 'USER', ...)` decorator and `RolesGuard`. No over-engineered granular RBAC permission matrix needed unless explicitly requested.
  - Super admin / Admin role bypasses restricted checks where applicable.
- **Logging**:
  - Three logging layers: access (HTTP requests), application (business logic/events), audit (critical data modifications).
- **Module Structure**:
  - Follow `domain / dto / infrastructure / persistence / mongo` layout.
- **DTOs & Validation**:
  - DTOs must use `class-validator` and `class-transformer`; reject unknown inputs at boundaries (`whitelist: true`, `forbidNonWhitelisted: true`).
  - **Whitespace Normalization**: Normalize and validate all textbox/textarea inputs by trimming whitespace before saving (`@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)`). Empty or spaced-only strings must be rejected or converted to null/undefined.
- **Transactions & Concurrency**:
  - Multi-step writes MUST be transactional using MongoDB `ClientSession` (via `withTransaction()` or a dedicated transaction runner/decorator).
  - Always handle session commit and abort cleanly without leaking database sessions.
- **MongoDB Population & Query Optimization**:
  - ❌ **FORBIDDEN:** Avoid unbounded or deep cascading `.populate()` calls across multiple document levels to prevent N+1 queries and memory bloat.
  - For list and detail queries, enforce explicit field projections (`select: 'field1 field2'`).
  - Use MongoDB Aggregation Pipelines (`$lookup` with `$project`) when joining collections.
  - Prefer embedding documents for 1-to-few relationships instead of referencing.
  - Always create indexes for frequently queried fields: unique keys (`email`), soft-delete filters (`deletedAt`), sort fields (`createdAt`), and compound indexes.
- **Testing & Quality Assurance**:
  - All new or modified Services MUST have corresponding unit test files (`*.spec.ts`) placed inside the sub-module's dedicated `tests/` directory (`src/modules/<module>/tests/`), following the AAA (Arrange-Act-Assert) pattern and mocking abstract domain repositories.
  - Task is NOT considered complete unless 100% of test cases pass.

---

## 2. Data & Migrations

- All database schema indexes and seed data must be managed through deterministic initialization scripts or migration tools (e.g., `migrate-mongo` or NestJS CLI seeder scripts).
- Add indexes for unique keys, `deletedAt`, `createdAt`, and compound search fields.
- TTL (Time-To-Live) indexes should be used for auto-expiring temporary records (e.g., sessions, OTPs).
- Seed scripts must be idempotent and separate from schema setup.

---

## 3. Security & Configuration

- Secrets in `.env` / secret manager only; never committed to repo.
- Config must be validated on startup using `@nestjs/config` and Joi / class-validator; missing required env fails fast.
- Mask PII (passwords, tokens, sensitive personal data) in logs and responses; avoid logging full payloads.
- Apply request size limits and rate limits (`@nestjs/throttler`) on public endpoints and auth routes.
- Enforce HTTPS for outbound calls in production.

---

## 4. Observability & Operations

- Correlation ID is required on every HTTP request and must propagate through logs and background tasks.
- Track API latency, error rate, and MongoDB slow queries.
- Log retention and audit retention must be configured.

---

## 5. Frontend Requirements (Next.js App Router + React + Tailwind CSS)

- **Structure**:
  - All features self-contained in `frontend/src/features/{feature}/` folder (components, hooks, types, api client).
  - App routing managed under `frontend/src/app/` (Next.js App Router).
- **Server vs Client Components**:
  - Default to React Server Components (RSC) for page shells, data fetching, and static layout rendering.
  - Use `'use client'` only for interactive components: forms, modal dialogs, data tables with client-side state, interactive controls.
- **List & Table**:
  - All list pages sync table state (page, search, sort, filter) with URL search parameters using Next.js navigation hooks (`useSearchParams`, `useRouter`, `usePathname`).
  - All tables use standardized `BaseDataTable` component with data-table toolbar.
  - **Fixed Viewport & Unified Scroll**: Wrap listing page content with layout containers (`min-h-0 flex-1 flex flex-col`) down to `<BaseDataTable>`, eliminating window double scrollbars while keeping table headers sticky at the top and pagination pinned at the bottom.
- **Authorization & Route Protection**:
  - Basic role verification (`ADMIN`, `USER`) via Next.js Middleware or client auth guards (`useAuth`, `RoleGuard`).
- **Mutations & Dialogs**:
  - All mutations use toast notifications (`sonner` or `react-hot-toast`) for feedback on success and failure.
  - All CRUD dialogs managed by `CrudContext` or clean modal state providers.
  - All dialogs must use a shared `DialogLayout` component for UI consistency.
  - Delete/remove operations must use `DeleteConfirmDialog`.
- **Forms & Inputs**:
  - All forms use `react-hook-form` wrapped with `<Controller />` or dedicated form fields.
  - Client-side validation using Zod schemas (`@hookform/resolvers/zod`).
  - Automatically trim whitespace on string inputs before submission; reject empty or space-only input.
- **Typography & Styling**:
  - ❌ **FORBIDDEN:** Do NOT use inline Tailwind CSS font classes (e.g., `font-sans`, `font-serif`) or inline `font-family` CSS properties to ensure consistent font synchronization across the system.
- **State & UX**:
  - All screens must define loading (skeletons / spinners), empty, and error states.
  - Basic accessibility (a11y): proper labels, keyboard navigation, and aria attributes where needed.
  - Server state caching and invalidation handled via TanStack React Query or Next.js cache revalidation tags.

---

## 6. Cross-Cutting & Global Strictness

- **Standard Query Params**: `page`, `limit`, `isPagination`, `sort`, `filters`.
- **JSON Filter/Sort**: Filter and sort formats use structured JSON (compatible with MongoDB queries).
- **Strict Typing**: ❌ **FORBIDDEN:** Do NOT use type `any` anywhere in the project. If `any` is ever needed, ask the user first.

---

## 7. Video Processing & AI Pipeline Rules (RabbitMQ + AssemblyAI + Gemini)

- **Asynchronous Execution**:
  - ❌ **FORBIDDEN:** Never execute long-running AI tasks (AssemblyAI speech-to-text, Gemini mindmap/quiz generation) synchronously inside standard HTTP requests.
  - Video upload requests MUST return immediate `202 Accepted` with initial status `UPLOADED` and dispatch an event/message to RabbitMQ.
- **RabbitMQ Topology & Consumer Patterns**:
  - Use structured Exchange/Queue topology (e.g., Exchange: `elearning.video.events`, Queue: `video.process.queue`).
  - Workers must employ **Manual Acknowledgment (Manual ACK)**: Acknowledge (`ack`) only after job completion or persistence. Reject with requeue (`nack(true)`) only on transient network glitches.
  - Configure **Dead Letter Exchange (DLX)** and Dead Letter Queue (DLQ) for unrecoverable errors after maximum retry count (e.g. 3 attempts).
  - Track job lifecycle in MongoDB: `UPLOADED` → `QUEUED` → `TRANSCRIBING` → `GENERATING_AI` → `READY` (or `FAILED` with explicit `failureReason`).
- **Data Contracts for AI Services**:
  - **AssemblyAI Transcript**: Persist verbatim transcript with word/sentence-level timestamp intervals (`start`, `end` in milliseconds/seconds).
  - **Gemini Mindmap Output**: Prompt Gemini to return standard hierarchical Markdown (`#`, `##`, `###`, `- `) compatible with `@markmap/react` / `markmap-view`.
  - **In-video Quiz Schema**: Quiz items generated by Gemini must specify `timestamp` (in seconds), `question`, `options` (array of strings), `correctIndex` (0-based integer), and `explanation`.

---

## 8. Payment Gateway & Webhook Rules (SePay)

- **Webhook Signature & Authentication**:
  - SePay incoming webhooks MUST be authenticated against an API Secret/Token configured in environment variables. Reject unauthenticated webhook requests with 401/403.
- **Idempotency & Concurrency Safety**:
  - All incoming transactions MUST record SePay's unique `transactionId` in MongoDB.
  - Check for duplicate `transactionId` before performing balance or enrollment mutations. Duplicate webhooks must return `200 OK` immediately without re-activating courses or duplicating enrollments.
- **Transactional Enrollment Activation**:
  - Course enrollment activation upon successful payment MUST execute within a MongoDB transaction session (`ClientSession`).
  - Strict validation on payment amount: received amount must be greater than or equal to the actual course price (`amount >= course.price`).

