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
    <Card className="w-full max-w-md border-border/50 bg-card/90 shadow-2xl backdrop-blur-md transition-all duration-300">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xl shadow-inner">
          ĐA
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          {headerTitle}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
          {headerDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">{children}</CardContent>

      <CardFooter className="flex justify-center border-t border-border/30 pt-4 pb-4">
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
