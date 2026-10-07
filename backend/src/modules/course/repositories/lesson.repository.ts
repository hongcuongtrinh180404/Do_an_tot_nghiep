import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { ILesson, ILessonMaterial } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonEntity } from '../schemas/lesson.schema.js';

@Injectable()
export class LessonRepository extends BaseMongoRepository<ILesson, LessonEntity> {
  constructor(
    @InjectModel(LessonEntity.name)
    lessonModel: Model<LessonEntity>,
  ) {
    super(lessonModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawSectionId = plain.sectionId;
      const sectionId =
        typeof rawSectionId === 'string'
          ? rawSectionId
          : (rawSectionId as { toString?: () => string })?.toString?.();

      const rawMaterials = Array.isArray(plain.materials) ? (plain.materials as Record<string, unknown>[]) : [];
      const materials: ILessonMaterial[] = rawMaterials.map((mat) => {
        const matId =
          typeof mat._id === 'string'
            ? mat._id
            : (mat._id as { toString?: () => string })?.toString?.() || (mat.id as string) || '';
        return {
          id: matId,
          title: (mat.title as string) || '',
          url: (mat.url as string) || '',
          fileName: (mat.fileName as string) || '',
          fileSize: typeof mat.fileSize === 'number' ? mat.fileSize : null,
          mimeType: (mat.mimeType as string) || null,
          publicId: (mat.publicId as string) || null,
          createdAt: (mat.createdAt as Date) || new Date(),
        };
      });

      return {
        ...plain,
        id: id as string,
        sectionId: (sectionId ?? '') as string,
        content: (plain.content ?? null) as ILesson['content'],
        materials,
        isPreview: Boolean(plain.isPreview),
      } as unknown as ILesson;
    });
  }

  async findBySectionId(
    sectionId: string,
    session?: ClientSession,
  ): Promise<ILesson[]> {
    const sectionObjectId = Types.ObjectId.isValid(sectionId)
      ? new Types.ObjectId(sectionId)
      : sectionId;

    const docs = await this.model
      .find({
        sectionId: sectionObjectId,
        deletedAt: null,
      })
      .sort({
        order: 1,
        _id: 1,
      })
      .session(session ?? null)
      .exec();

    return docs.map((doc) => this.toDomain(doc));
  }

  async softDeleteBySectionId(
    sectionId: string,
    userId?: string,
    session?: ClientSession,
  ): Promise<number> {
    const sectionObjectId = Types.ObjectId.isValid(sectionId)
      ? new Types.ObjectId(sectionId)
      : sectionId;

    const result = await this.model.updateMany(
      {
        sectionId: sectionObjectId,
        deletedAt: null,
      },
      {
        $set: {
          deletedAt: new Date(),
          ...(userId ? { updatedById: userId } : {}),
        },
      },
      { session: session ?? undefined },
    );

    return result.modifiedCount;
  }

  async addMaterial(
    lessonId: string,
    material: Omit<ILessonMaterial, 'id'>,
    session?: ClientSession,
  ): Promise<ILesson | null> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const doc = await this.model
      .findOneAndUpdate(
        { _id: lessonObjectId, deletedAt: null },
        {
          $push: {
            materials: {
              ...material,
              _id: new Types.ObjectId(),
            },
          },
        },
        { new: true, session: session ?? null },
      )
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async deleteMaterial(
    lessonId: string,
    materialId: string,
    session?: ClientSession,
  ): Promise<ILesson | null> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;
    const materialObjectId = Types.ObjectId.isValid(materialId)
      ? new Types.ObjectId(materialId)
      : materialId;

    const doc = await this.model
      .findOneAndUpdate(
        { _id: lessonObjectId, deletedAt: null },
        {
          $pull: {
            materials: { _id: materialObjectId },
          },
        },
        { new: true, session: session ?? null },
      )
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async reorderAfterDelete(
    sectionId: string,
    deletedOrder: number,
    session?: ClientSession,
  ): Promise<number> {
    const sectionObjectId = Types.ObjectId.isValid(sectionId)
      ? new Types.ObjectId(sectionId)
      : sectionId;

    const result = await this.model.updateMany(
      {
        sectionId: sectionObjectId,
        deletedAt: null,
        order: { $gt: deletedOrder },
      },
      {
        $inc: { order: -1 },
      },
      { session: session ?? undefined },
    );

    return result.modifiedCount;
  }
}
