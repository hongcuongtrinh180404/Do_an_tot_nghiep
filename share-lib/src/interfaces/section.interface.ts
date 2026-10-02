export interface ISection {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  order: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

export interface ICreateSectionPayload {
  title: string;
  description?: string | null;
  order?: number;
}

export interface IReorderSectionsPayload {
  sectionIds: string[];
}

