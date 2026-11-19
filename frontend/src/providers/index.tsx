'use client';

import React from 'react';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryProvider } from './query-provider';
import { AuthSyncHandler } from './auth-sync-handler';
import dynamic from 'next/dynamic';

const ChatbotWidget = dynamic(() => import('@/features/chatbot/components/chatbot-widget'), {
  ssr: false,
});

interface AppProvidersProps {
  children: React.ReactNode;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryProvider>
        <AuthSyncHandler />
        {children}
        <ChatbotWidget />
        <Toaster position="top-right" richColors closeButton />
      </QueryProvider>
    </GoogleOAuthProvider>
  );
}
