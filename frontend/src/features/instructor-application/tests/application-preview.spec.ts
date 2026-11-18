import { describe, expect, it } from 'vitest';
import { getApplicationPreview } from '../instructor-application';

describe('application UI preview isolation', () => {
  it.each(['not-applied', 'pending', 'rejected'])('ignores %s outside the development preview', (status) => {
    expect(getApplicationPreview(status, false)).toBeNull();
  });

  it.each([null, '', 'approved', 'admin', 'pending '])('does not create an application for unknown values: %s', (status) => {
    expect(getApplicationPreview(status, true)).toBeNull();
  });
});
