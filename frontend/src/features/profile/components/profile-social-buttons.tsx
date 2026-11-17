'use client';

import React from 'react';
import type { ISocialLinks } from 'share-lib';
import { Icon } from '@/components/ui/icon';

interface ProfileSocialButtonsProps {
  socialLinks?: ISocialLinks | null;
  className?: string;
}

export function formatSocialUrl(
  platform: 'facebook' | 'youtube' | 'linkedin' | 'github',
  raw?: string | null,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If already an absolute HTTP/HTTPS URL
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // If user entered e.g. "facebook.com/username"
  if (/^(www\.)?(facebook\.com|youtube\.com|youtu\.be|linkedin\.com|github\.com)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  const clean = trimmed.replace(/^@+/, '');

  switch (platform) {
    case 'facebook':
      return `https://facebook.com/${clean}`;
    case 'youtube':
      return clean.startsWith('@') ? `https://youtube.com/${clean}` : `https://youtube.com/@${clean}`;
    case 'linkedin':
      return clean.startsWith('in/') ? `https://linkedin.com/${clean}` : `https://linkedin.com/in/${clean}`;
    case 'github':
      return `https://github.com/${clean}`;
    default:
      return `https://${trimmed}`;
  }
}

interface SocialChannelConfig {
  key: 'facebook' | 'linkedin' | 'youtube' | 'github';
  name: string;
  icon: string;
  iconClass?: string;
}

const SOCIAL_CHANNELS: readonly SocialChannelConfig[] = [
  {
    key: 'facebook',
    name: 'Facebook',
    icon: 'logos:facebook',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    icon: 'logos:linkedin-icon',
  },
  {
    key: 'youtube',
    name: 'YouTube',
    icon: 'logos:youtube-icon',
  },
  {
    key: 'github',
    name: 'GitHub',
    icon: 'mdi:github',
    iconClass: 'text-foreground',
  },
] as const;

export function ProfileSocialButtons({
  socialLinks,
  className = '',
}: ProfileSocialButtonsProps): React.JSX.Element | null {
  if (!socialLinks) return null;

  const activeLinks = SOCIAL_CHANNELS.map((channel) => {
    const rawVal = socialLinks[channel.key];
    const url = formatSocialUrl(channel.key, rawVal);
    return { ...channel, url };
  }).filter((item): item is SocialChannelConfig & { url: string } => Boolean(item.url));

  if (activeLinks.length === 0) return null;

  return (
    <div
      data-testid="profile-social-buttons"
      className={`flex items-center justify-center gap-2 w-full pt-1 ${className}`}
    >
      {activeLinks.map((channel) => (
        <a
          key={channel.key}
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer"
          title={channel.name}
          aria-label={`Trang ${channel.name} của người dùng`}
          className="size-9 inline-flex items-center justify-center rounded-lg border border-border/80 bg-background hover:bg-muted/80 transition-all hover:scale-105 active:scale-95 shadow-2xs group"
        >
          <Icon
            icon={channel.icon}
            className={`size-4.5 shrink-0 transition-transform ${channel.iconClass || ''}`}
          />
        </a>
      ))}
    </div>
  );
}
