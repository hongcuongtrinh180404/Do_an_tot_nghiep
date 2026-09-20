# Base Abstract & Audit Field — Dependencies & Components

> **Description:** Core shared classes, interfaces, interceptors, and test files for Base Document and Audit handling.

---

## 1. Backend Core Source Files

- **Document Schema**:
  - `backend/src/common/database/base.abstract.document.ts`: Abstract base Mongoose document schema
- **Repository Abstractions & Implementations**:
  - `backend/src/common/repositories/base.repository.interface.ts`: Abstract domain repository interface
  - `backend/src/common/repositories/base.mongo.repository.ts`: Generic Mongoose implementation of domain repository
- **Service Base & Context**:
  - `backend/src/common/services/base.service.ts`: Abstract service with audit context & logger
  - `backend/src/common/context/request-context.service.ts`: AsyncLocalStorage wrapper for user & correlation ID
  - `backend/src/common/interceptors/audit-context.interceptor.ts`: Extracts user from HTTP request and binds to context
- **Testing Files**:
  - `backend/src/common/tests/base.service.spec.ts`: Unit test verifying audit population
  - `backend/src/common/tests/base.mongo.repository.spec.ts`: Unit test verifying soft delete filter & transactions
