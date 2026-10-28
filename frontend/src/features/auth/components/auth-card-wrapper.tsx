import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MindlyLogo } from '@/components/brand';

interface AuthCardWrapperProps {
  children: React.ReactNode;
  headerTitle: string;
  headerDescription: string;
  backButtonLabel: string;
  backButtonHref: string;
  backButtonText: string;
}

export function AuthCardWrapper({
  children,
  headerTitle,
  headerDescription,
  backButtonLabel,
  backButtonHref,
  backButtonText,
}: AuthCardWrapperProps): React.JSX.Element {
  return (
    <Card className="w-full max-w-[448px] border border-border/60 bg-card/95 shadow-sm sm:shadow-md rounded-2xl transition-all duration-200">
      <CardHeader className="space-y-1.5 text-center pb-3 pt-5 px-6 sm:px-8">
        <div className="mx-auto mb-1 flex items-center justify-center">
          <Link
            href="/"
            aria-label="Mindly - Map Your Mind"
            className="transition-transform duration-200 hover:scale-105"
          >
            <MindlyLogo variant="light-header" className="h-11 w-auto" showSlogan={true} />
          </Link>
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          {headerTitle}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-[340px] mx-auto">
          {headerDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 sm:px-8 pb-4 pt-0.5">{children}</CardContent>

      <CardFooter className="flex justify-center border-t border-border/40 py-3.5 px-6 sm:px-8 bg-muted/20 rounded-b-2xl">
        <p className="text-xs text-muted-foreground text-center">
          {backButtonLabel}{' '}
          <Link
            href={backButtonHref}
            className="font-semibold text-primary underline-offset-4 hover:underline transition-colors"
          >
            {backButtonText}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
