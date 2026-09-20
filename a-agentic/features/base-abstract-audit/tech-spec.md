# Base Abstract & Audit Field — Technical Specification

> **Description:** Specification for Base Mongoose Document, Audit Fields, Abstract Domain Repository, and Base Service with automated audit context capture.

---

## 1. Schema: `BaseAbstractDocument`

All Mongoose schemas for business entities MUST inherit `BaseAbstractDocument`:

```typescript
import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export abstract class BaseAbstractDocument {
  _id: Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: String, default: null })
  createdById?: string | null;

  @Prop({ type: String, default: null })
  updatedById?: string | null;
}
```

### Key Field Specifications:

| Field Name    | Data Type            | Default | Description                                            |
| :------------ | :------------------- | :------ | :----------------------------------------------------- |
| `_id`         | `Types.ObjectId`     | Auto    | MongoDB Primary Key                                    |
| `createdAt`   | `Date`               | `now()` | Timestamp of document creation (managed by timestamps) |
| `updatedAt`   | `Date`               | `now()` | Timestamp of last document update                      |
| `deletedAt`   | `Date \| null`       | `null`  | Timestamp of soft deletion (null = active record)      |
| `createdById` | `string \| null`     | `null`  | User ID of creator (captured from JWT request context) |
| `updatedById` | `string \| null`     | `null`  | User ID of modifier or deleter                         |

---

## 2. Abstract Domain Repository: `BaseRepository<DomainModel, ID>`

The contract that abstracts persistence away from the business layer:

```typescript
import { ClientSession } from 'mongoose';

export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: Array<{ orderBy: string; order: 'asc' | 'desc' }>;
  filters?: Record<string, unknown>;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BaseRepository<DomainModel, ID = string> {
  create(payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel>;
  findById(id: ID, session?: ClientSession): Promise<DomainModel | null>;
  findManyWithPagination(options: PaginationOptions, session?: ClientSession): Promise<PaginationResult<DomainModel>>;
  update(id: ID, payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel | null>;
  softDelete(id: ID, session?: ClientSession): Promise<boolean>;
  restore(id: ID, session?: ClientSession): Promise<boolean>;
  withTransaction<R>(operation: (session: ClientSession) => Promise<R>): Promise<R>;
}
```

---

## 3. Concrete Implementation: `BaseMongoRepository<DomainModel, DocumentType>`

Wraps Mongoose `Model<DocumentType>`:

- Default Filter: All `find` and `findById` operations automatically append `{ deletedAt: null }`.
- Session Binding: Automatically propagates `ClientSession` if provided.
- Domain Mapping: Translates between Mongoose HydratedDocument and Domain Model interface without exposing raw MongoDB documents to services.

---

## 4. Service Architecture: `BaseService`

All domain services inherit `BaseService`:

- Interacts with Request Context / AsyncLocalStorage to retrieve:
  - `currentUserId`: ID of the authenticated user (or `'SYSTEM'` for background jobs).
  - `correlationId`: Unique tracing ID for logging.
- Automatically populates `createdById` and `updatedById` when calling repository methods.
