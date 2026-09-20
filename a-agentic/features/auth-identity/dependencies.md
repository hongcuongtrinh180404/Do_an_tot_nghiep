# Authentication & Identity — Dependencies & Components

> **Description:** Source files, components, and module dependencies for Auth & Identity across `share-lib`, `backend` (NestJS), and `frontend` (Next.js App Router).

---

## 1. Shared Library (`share-lib`)

- **Enums**:
  - `share-lib/src/enums/role.enum.ts`: `RoleEnum` (`ADMIN`, `USER`)
  - `share-lib/src/enums/auth-provider.enum.ts`: `AuthProviderEnum` (`LOCAL`, `GOOGLE`, `GITHUB`)
  - `share-lib/src/enums/user-status.enum.ts`: `UserStatusEnum` (`ACTIVE`, `INACTIVE`, `SUSPENDED`)
- **Interfaces & Constants**:
  - `share-lib/src/interfaces/auth.interface.ts`: `ILoginPayload`, `IRegisterPayload`, `IAuthTokens`, `IAuthResponse`, `IJwtPayload`
  - `share-lib/src/interfaces/user.interface.ts`: `IUser`, `IUserProfile`
  - `share-lib/src/interfaces/session.interface.ts`: `ISession`
  - `share-lib/src/interfaces/api-response.interface.ts`: `IApiResponse<T>`
  - `share-lib/src/constants/auth.constants.ts`: `AUTH_CONSTANTS` (Grace period 30s, token lifetimes)

---

## 2. Backend Source Files (NestJS)

- **Auth Module (`backend/src/modules/auth/`)**:
  - `auth.controller.ts`: Endpoints (`POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`)
  - `services/auth.service.ts`: Orchestrates registration, login, token refresh, logout, profile fetching, and OAuth expansion hook
  - `services/local-auth.service.ts`: Password hashing (bcrypt) and credential validation
  - `services/auth-token.service.ts`: JWT access & refresh token signing, SHA-256 token hashing, verification
  - `guards/jwt-auth.guard.ts`: JWT Bearer authentication guard with `@Public()` decorator bypass
  - `guards/roles.guard.ts`: Role-based access control with `ADMIN` role bypass
  - `decorators/public.decorator.ts`, `decorators/roles.decorator.ts`, `decorators/current-user.decorator.ts`
  - `dto/register.dto.ts`, `dto/login.dto.ts`, `dto/refresh-token.dto.ts`: Trimmed validation DTOs
  - `tests/auth.service.spec.ts`, `tests/roles.guard.spec.ts`

- **User Module (`backend/src/modules/user/`)**:
  - `schemas/user.schema.ts`: `UserEntity` extending `BaseAbstractDocument`
  - `repositories/user.repository.ts`: Abstract domain repository implementation
  - `services/user.service.ts`: User query & conflict verification methods
  - `tests/user.service.spec.ts`

- **Session Module (`backend/src/modules/session/`)**:
  - `schemas/session.schema.ts`: `SessionEntity` with TTL indexing on `expiresAt`
  - `repositories/session.repository.ts`: Session domain persistence layer
  - `services/session.service.ts`: Session lifecycle, 30s Grace Period token reuse, replay-attack detection
  - `tests/session.service.spec.ts`

---

## 3. Frontend Source Files (Next.js App Router - Planned)

- **App Routes**:
  - `frontend/src/app/(auth)/login/page.tsx`: Authentication login page
  - `frontend/src/app/(auth)/register/page.tsx`: User registration page
- **Features**:
  - `frontend/src/features/auth/`: Auth forms, login hooks, session handlers
  - `frontend/src/features/users/`: User tables, user forms, user mutations
- **Auth Provider & Sync**:
  - `frontend/src/context/auth-context.tsx`: Context provider managing current user & session
  - `frontend/src/lib/auth-sync.ts`: Multi-tab synchronization (`BroadcastChannel`, Web Locks API)
