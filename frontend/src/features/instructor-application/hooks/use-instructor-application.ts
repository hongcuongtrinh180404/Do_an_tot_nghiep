'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { RoleEnum, InstructorApplicationStatusEnum } from 'share-lib';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useMyInstructorApplicationQuery } from '../api/instructor-application.api';
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

  const myAppQuery = useMyInstructorApplicationQuery(Boolean(auth.data));

  const preview = getApplicationPreview(
    searchParams.get('preview'),
    process.env.NODE_ENV === 'development' &&
    pathname === BECOME_INSTRUCTOR_PATH &&
    auth.data?.role === RoleEnum.STUDENT,
  );

  // Map real backend application if present
  let realApplication: InstructorApplication = EMPTY_APPLICATION;
  if (myAppQuery.data) {
    const raw = myAppQuery.data;
    if (raw.status === InstructorApplicationStatusEnum.PENDING) {
      realApplication = {
        status: 'pending',
        submittedAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
        applicantData: {
          fullName: raw.applicantName,
          email: raw.email,
          phone: raw.phone,
          expertises: raw.expertises || [],
          bio: raw.bio,
          experience: raw.experience,
          cvFileName: raw.cvFileName || undefined,
        },
      };
    } else if (raw.status === InstructorApplicationStatusEnum.REJECTED) {
      realApplication = {
        status: 'rejected',
        submittedAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
        reviewedAt: typeof raw.reviewedAt === 'string' ? raw.reviewedAt : undefined,
        rejectionReason: raw.rejectionReason || undefined,
        applicantData: {
          fullName: raw.applicantName,
          email: raw.email,
          phone: raw.phone,
          expertises: raw.expertises || [],
          bio: raw.bio,
          experience: raw.experience,
          cvFileName: raw.cvFileName || undefined,
        },
      };
    }
  }

  const application = preview ?? (myAppQuery.data ? realApplication : EMPTY_APPLICATION);
  const previewQuery = preview ? `?preview=${application.status}` : '';
  const href =
    application.status === 'not-applied'
      ? `${BECOME_INSTRUCTOR_PATH}${previewQuery}`
      : `${BECOME_INSTRUCTOR_PATH}${previewQuery}#registration`;

  return {
    user: auth.data,
    isLoading: !isMounted || auth.isLoading || myAppQuery.isLoading,
    isError: auth.isError || myAppQuery.isError,
    retry: () => {
      void auth.refetch();
      void myAppQuery.refetch();
    },
    application,
    rawApplication: myAppQuery.data,
    isPreview: preview !== null,
    href,
    menuLabel: INSTRUCTOR_APPLICATION_LABELS[application.status],
  };
}
