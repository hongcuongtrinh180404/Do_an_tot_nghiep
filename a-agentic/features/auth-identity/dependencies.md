# Authentication & Identity — Dependencies & Components

> **Description:** Source files, components, and module dependencies for Auth & Identity in NestJS + Next.js App Router.

---

## 1. Backend Source Files (NestJS)

- **Controllers**:
  - `backend/src/modules/auth/auth.controller.ts`
  - `backend/src/modules/user/user.controller.ts`
- **Services**:
  - `backend/src/modules/auth/auth.service.ts`
  - `backend/src/modules/user/user.service.ts`
  - `backend/src/modules/session/session.service.ts`
- **Guards & Decorators**:
  - `backend/src/common/guards/jwt-auth.guard.ts`
  - `backend/src/common/guards/roles.guard.ts`
  - `backend/src/common/decorators/roles.decorator.ts`
  - `backend/src/common/decorators/current-user.decorator.ts`
- **Schemas & Repositories**:
  - `backend/src/modules/user/schemas/user.schema.ts`
  - `backend/src/modules/user/repositories/user.repository.ts`
  - `backend/src/modules/session/schemas/session.schema.ts`
  - `backend/src/modules/session/repositories/session.repository.ts`
- **Tests**:
  - `backend/src/modules/auth/tests/auth.service.spec.ts`
  - `backend/src/modules/user/tests/user.service.spec.ts`

---

## 2. Frontend Source Files (Next.js App Router)

- **App Routes**:
  - `frontend/src/app/(auth)/login/page.tsx`: Authentication login page
  - `frontend/src/app/(dashboard)/users/page.tsx`: User management page
- **Features**:
  - `frontend/src/features/auth/`: Auth forms, login hooks, session handlers
  - `frontend/src/features/users/`: User tables, user forms, user mutations
- **Auth Provider & Sync**:
  - `frontend/src/context/auth-context.tsx`: Context provider managing current user & session
  - `frontend/src/lib/auth-sync.ts`: Multi-tab synchronization (`BroadcastChannel`, Web Locks API)
