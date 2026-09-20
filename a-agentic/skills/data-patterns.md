# Data Patterns & Schema Guidelines

> **Description:** Database design standards, Mongoose schema conventions, MongoDB indexing strategy, query parameter contracts, and Role models.

---

## 1. Document Base Schema Architecture

All Mongoose document schemas MUST inherit or include `BaseAbstractDocument` to maintain automated auditing, soft deletion, and timestamp tracking:

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

---

## 2. MongoDB Query & Population Optimization

> 🔴 **CRITICAL:** Avoid unbounded `.populate()` cascades. For detail and list queries, enforce explicit projections and optimize collection references.

```typescript
// ✅ CORRECT: Explicit field projection and targeted population
const order = await this.orderModel
  .findOne({ _id: id, deletedAt: null })
  .select('orderNumber totalAmount status customerId items')
  .populate({
    path: 'customerId',
    select: 'firstName lastName email',
  })
  .exec();

// ✅ CORRECT: Aggregation Pipeline for complex joins
const orderWithDetails = await this.orderModel.aggregate([
  { $match: { _id: new Types.ObjectId(id), deletedAt: null } },
  {
    $lookup: {
      from: 'users',
      localField: 'customerId',
      foreignField: '_id',
      as: 'customer',
      pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
    },
  },
  { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
]);

// ❌ WRONG: Cascading unconstrained populate loading unnecessary data into memory
const order = await this.orderModel.findById(id).populate('customer items vendor').exec();
```

---

## 3. MongoDB Indexing Strategy

- **Unique Indexes**: Ensure uniqueness on business keys (`email`, `sku`, `code`).
- **Soft-Delete Compound Indexes**: Queries frequently filter by active records (`deletedAt: null`). Add compound indexes such as:
  ```typescript
  @Schema({ timestamps: true })
  export class UserDocument extends BaseAbstractDocument {
    // ...
  }
  export const UserSchema = SchemaFactory.createForClass(UserDocument);
  UserSchema.index({ deletedAt: 1, createdAt: -1 });
  ```
- **TTL Indexes**: Use TTL indexes for temporary records like refresh sessions, OTP codes, or cache documents:
  ```typescript
  SessionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
  ```

---

## 4. Standard Query Parameters Contract

All listing and pagination endpoints must adhere to the standardized query structure:

| Parameter      | Type            | Default                                    | Description                                        |
| :------------- | :-------------- | :----------------------------------------- | :------------------------------------------------- |
| `page`         | `number`        | `1`                                        | Current page number (1-indexed)                    |
| `limit`        | `number`        | `10`                                       | Items per page (Max: `100`)                        |
| `isPagination` | `boolean`       | `true`                                     | When `false`, returns all records matching filters |
| `sort`         | `string` (JSON) | `[{"orderBy":"createdAt","order":"desc"}]` | Structured sorting criteria                        |
| `filters`      | `string` (JSON) | `{"status":{"$eq":"ACTIVE"}}`              | Structured MongoDB-compatible filtering criteria   |

---

## 5. Role-Based Access Control (Role Standards)

The system enforces basic Role-Based Access Control:

- **System Roles Enum**:
  ```typescript
  export enum RoleEnum {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    USER = 'USER',
  }
  ```
- **Controller Protection**:
  Use `@Roles(RoleEnum.ADMIN)` decorator paired with `JwtAuthGuard` and `RolesGuard`.
- **Admin Bypass**:
  `SUPER_ADMIN` or `ADMIN` roles inherently possess administrative bypass capabilities for operational management.
