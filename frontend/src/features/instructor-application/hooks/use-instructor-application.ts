'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { RoleEnum } from 'share-lib';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useIsMounted } from '@/hooks/use-is-mounted';
import {
  BECOME_INSTRUCTOR_PATH,
  getApplicationPreview,
  INSTRUCTOR_APPLICATION_LABELS,
  type InstructorApplication,
} from '../instructor-application';

const EMPTY_APPLICATION: InstructorApplication = { status: 'not-applied' };

export function useInstructorApplication() {
  const auth = useCurrentUserQuery();
  const isMounted = useIsMounted();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preview = getApplicationPreview(
    searchParams.get('preview'),
    process.env.NODE_ENV === 'development' &&
      pathname === BECOME_INSTRUCTOR_PATH &&
      auth.data?.role === RoleEnum.STUDENT,
  );

  // Replace this adapter with the account's application query when the form and
  // its API are implemented. Never persist preview fixtures in the auth cache.
  const application = preview ?? EMPTY_APPLICATION;
  const previewQuery = preview ? `?preview=${application.status}` : '';
  const href =
    application.status === 'not-applied'
      ? `${BECOME_INSTRUCTOR_PATH}${previewQuery}`
      : `${BECOME_INSTRUCTOR_PATH}${previewQuery}#registration`;

  return {
    user: auth.data,
    isLoading: !isMounted || auth.isLoading,
    isError: auth.isError,
    retry: auth.refetch,
    application,
    isPreview: preview !== null,
    href,
    menuLabel: INSTRUCTOR_APPLICATION_LABELS[application.status],
  };
}
