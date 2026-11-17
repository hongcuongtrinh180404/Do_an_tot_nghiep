import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { ProfilePageView } from '@/features/profile/components/profile-page-view';
import { getPublicProfile } from '@/features/profile/services/public-profile.server';
import { getPublicProfilePath } from '@/features/profile/utils/profile-url';

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: 'Không tìm thấy hồ sơ | Mindly', robots: { index: false } };
  return {
    title: `${profile.fullName} | Mindly`,
    description: profile.bio || `Trang cá nhân của ${profile.fullName} trên Mindly`,
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps): Promise<React.JSX.Element> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();
  if (username !== profile.username) redirect(getPublicProfilePath(profile.username));

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Suspense fallback={<div className="h-16 bg-neutral-900" />}>
        <PublicHeader />
      </Suspense>
      <main className="flex-1">
        <ProfilePageView key={profile.username} profile={profile} />
      </main>
      <PublicFooter />
    </div>
  );
}
