# Clean Code & Engineering Standards

> **Description:** Engineering standards, strict typing conventions, architecture patterns, and automated test guidelines for NestJS + MongoDB + Next.js App Router codebase.

---

## 1. Core Engineering Principles

### 1.1 Surgical Edits (Precision Code Changes)

- Modify only the required lines of code. Do NOT reformat unrelated code blocks or wipe existing functional comments.
- Preserve domain-specific comments and historical context unless explicitly requested.

### 1.2 Strict Typing (Zero `any` Policy)

- ❌ **FORBIDDEN:** Never use `any`, `unknown as any`, or non-type-safe type assertions in TypeScript.
- If an unavoidable external typing edge case arises, consult the user before proceeding.
- Define explicit interfaces and types for all entities, schemas, DTOs, and API responses.
- Always declare exact return types for public service and repository methods.

---

## 2. Backend Engineering Standards (NestJS + MongoDB / Mongoose)

### 2.1 Services & Dependency Injection

- All services MUST inherit `BaseService` to automatically capture request context, logging, and audit trails.
- Services MUST inject Abstract Domain Repositories (`BaseRepository<DomainModel, ID>`).
- ❌ **FORBIDDEN:** Do NOT inject raw Mongoose `@InjectModel(Entity.name)` or manipulate database queries/documents directly inside Services. Services focus purely on business logic and orchestration.

### 2.2 Transactions & Data Consistency

- Multi-step writes MUST be transactional using MongoDB `ClientSession` (via `session.withTransaction()` or a dedicated transaction runner/decorator).
- ❌ **FORBIDDEN:** Do NOT leave open or uncommitted MongoDB sessions. Always commit or abort and end the session in `finally` blocks.

### 2.3 Input Validation & Normalization

- All DTOs must use `class-validator` and `class-transformer`.
- **String Input Trimming**: Always normalize textbox and textarea strings using `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)`.
- Prevent empty strings or whitespace-only inputs from being saved as valid values.

### 2.4 Authorization

- Use basic Role-Based Access Control (`@Roles('ADMIN', 'USER')` and `RolesGuard`).
- Keep authorization logic clean, maintainable, and readable without unnecessary granular permission over-engineering.

---

## 3. Frontend Engineering Standards (Next.js App Router + React + Tailwind CSS)

### 3.1 Server vs Client Components

- Use React Server Components (RSC) by default for page shells, layouts, and initial data loading.
- Add `'use client'` directive exclusively at the top of files that require browser APIs, state hooks (`useState`, `useEffect`), or user interactions (forms, dialogs, dropdowns).

### 3.2 Dialogs & CRUD Operations

- All dialogs MUST use `DialogLayout` (`frontend/src/components/ui/dialog-layout.tsx`).
- Delete/remove operations MUST use `DeleteConfirmDialog` (`frontend/src/components/delete-confirm-dialog.tsx`).
- Manage modal state cleanly with component state or dedicated context providers.

### 3.3 Forms & Controller Pattern

- All forms using `react-hook-form` must wrap inputs with `<Controller />` or dedicated form field components.
- Validate inputs client-side using Zod schemas (`@hookform/resolvers/zod`) and display inline field errors consistently.
- Always trim string inputs on submission to prevent saving blank spaces.

### 3.4 Typography & Styling Discipline

- ❌ **FORBIDDEN:** Do NOT use inline Tailwind CSS font classes (`font-sans`, `font-serif`) or inline `font-family` CSS properties to maintain synchronized typography across the application.

### 3.5 Fixed Viewport & Unified BaseDataTable Layout Standards

- **Single Scrollbar Architecture**: Standard data table listing pages utilize fixed viewport sizing to eliminate nested/double scrollbars (window scroll vs inner table scroll).
- **Layout Requirements**:
  - Wrapper containers between the main layout and `<BaseDataTable>` must propagate `min-h-0 flex-1 flex flex-col` so that CSS flexbox correctly computes available height without overflowing the viewport.
  - The inner table container in `BaseDataTable` handles vertical and horizontal overflow (`h-full flex-1 min-h-0 overflow-auto`), keeping table headers sticky at the top and pagination pinned at the bottom (`shrink-0`).
- **URL Synchronization**:
  - All pagination, search filters, and sort options must be synced with URL query parameters via Next.js navigation hooks (`useSearchParams`, `useRouter`, `usePathname`).

---

## 4. Anti-Patterns & Common Pitfalls

- ❌ **NO UNBOUNDED POPULATE**: Avoid deep cascading `.populate()` in Mongoose. Always specify explicit projections (`select: 'fieldName'`) and use Aggregation Pipelines with `$lookup` + `$project` for complex joins.
- ❌ **NO TYPE ANY**: Every variable, function parameter, and API payload must have explicit TypeScript typing.
- ❌ **NO HARDCODED CONSTANTS**: Extract status strings, roles, and configuration keys into shared TypeScript enums or constants.
- ❌ **NO SILENT ERROR SWALLOWING**: Always throw standardized NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`, `ForbiddenException`).

---

## 5. Automated Test Writing Standards (Unit & Integration Tests)

> 🔴 **MANDATORY:** Every new or modified service logic MUST include comprehensive unit tests.

### 5.1 Test File Storage & Naming

| Test Category                                       | Target Storage Directory                     | Naming Pattern                  | Example Path                                              |
| :-------------------------------------------------- | :------------------------------------------- | :------------------------------ | :-------------------------------------------------------- |
| **Backend Unit Test** (Service, Controller, Helper) | Sub-module dedicated `tests/` directory      | `<name>.spec.ts`                | `backend/src/modules/user/tests/user.service.spec.ts`      |
| **Backend E2E / Integration Test**                  | Central `backend/test/<feature>/` directory  | `<feature>.e2e-spec.ts`         | `backend/test/auth/auth.e2e-spec.ts`                      |
| **Frontend Component / Hook Test**                  | Feature dedicated `tests/` directory         | `<name>.spec.tsx` or `.test.ts` | `frontend/src/features/users/tests/user-table.spec.tsx`   |

### 5.2 Unit Test Structure (AAA Pattern & Mocking)

- **AAA Pattern (Arrange - Act - Assert)**:
  - **Arrange**: Prepare input mocks and domain repository mock objects.
  - **Act**: Execute the target service method.
  - **Assert**: Verify return output (`expect(...)`) and mock method invocations (`expect(repo.create).toHaveBeenCalledTimes(1)`).
- **Mocking Strategy**: Mock Abstract Domain Repository Interfaces; **never connect to a real MongoDB database** in unit tests:
  ```typescript
  const mockUserRepository: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findManyWithPagination: jest.fn(),
  };
  ```

### 5.3 Required Test Scenarios:

1. **Happy Path**: Valid inputs and correct response structures.
2. **Not Found / Invalid Input**: Non-existent IDs throwing `NotFoundException` or `BadRequestException`.
3. **Authorization / Roles**: Unauthorized role execution scenarios.
4. **Boundary & Edge Cases**: Empty arrays, zero values, edge-condition strings, trimmed whitespace verification.
