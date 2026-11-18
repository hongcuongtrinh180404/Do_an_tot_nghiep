import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { IInstructorTerm } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import {
  InstructorTermEntity,
  InstructorTermDocument,
} from '../schemas/instructor-term.schema.js';
import { TermItemDto } from '../dto/update-instructor-terms.dto.js';

@Injectable()
export class InstructorTermRepository extends BaseMongoRepository<
  IInstructorTerm,
  InstructorTermDocument,
  string
> {
  constructor(
    @InjectModel(InstructorTermEntity.name)
    termModel: Model<InstructorTermDocument>,
  ) {
    super(termModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id =
        typeof rawId === 'string'
          ? rawId
          : (rawId as { toString?: () => string })?.toString?.() ?? '';

      return {
        id,
        title: (plain.title as string) || '',
        content: (plain.content as string) || '',
        isMandatory: plain.isMandatory !== undefined ? Boolean(plain.isMandatory) : true,
        order: typeof plain.order === 'number' ? plain.order : 0,
        createdAt: plain.createdAt ? new Date(plain.createdAt as string | Date).toISOString() : undefined,
        updatedAt: plain.updatedAt ? new Date(plain.updatedAt as string | Date).toISOString() : undefined,
      };
    });
  }

  async findAllOrdered(session?: ClientSession): Promise<IInstructorTerm[]> {
    const docs = await this.model
      .find({ deletedAt: null })
      .sort({ order: 1, createdAt: 1 })
      .session(session ?? null)
      .exec();

    return docs.map((doc) => this.toDomain(doc));
  }

  async replaceAllTerms(
    termDtos: TermItemDto[],
    session?: ClientSession,
  ): Promise<IInstructorTerm[]> {
    // Soft delete existing terms
    await this.model
      .updateMany(
        { deletedAt: null },
        { $set: { deletedAt: new Date() } },
        { ...(session ? { session } : {}) },
      )
      .exec();

    // Insert new terms
    const docsToInsert = termDtos.map((t, index) => ({
      title: t.title,
      content: t.content,
      isMandatory: t.isMandatory !== undefined ? t.isMandatory : true,
      order: typeof t.order === 'number' ? t.order : index + 1,
      deletedAt: null,
    }));

    if (docsToInsert.length > 0) {
      await this.model.insertMany(docsToInsert, { ...(session ? { session } : {}) });
    }

    return this.findAllOrdered(session);
  }
}
