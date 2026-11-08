import { describe, expect, it } from 'vitest';
import type { DynamicModule, ForwardReference, Type } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { CourseModule } from '../course.module.js';
import { EnrollmentModule } from '../../enrollment/enrollment.module.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';

type ModuleImport = Type<unknown> | DynamicModule | ForwardReference;

describe('CourseModule enrollment access', () => {
  it('imports EnrollmentModule through a forward reference so lessons can check purchased access', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      CourseModule,
    ) as ModuleImport[];

    expect(
      imports.some(
        (imported) =>
          'forwardRef' in imported &&
          imported.forwardRef() === EnrollmentModule,
      ),
    ).toBe(true);
  });

  it('keeps the reverse course dependency deferred and exports EnrollmentRepository', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      EnrollmentModule,
    ) as ModuleImport[];
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      EnrollmentModule,
    ) as unknown[];

    expect(
      imports.some(
        (imported) =>
          'forwardRef' in imported && imported.forwardRef() === CourseModule,
      ),
    ).toBe(true);
    expect(exports).toContain(EnrollmentRepository);
  });
});
