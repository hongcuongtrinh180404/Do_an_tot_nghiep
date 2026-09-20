import { QueryClient, isServer } from '@tanstack/react-query';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute fresh time
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
        refetchOnWindowFocus: false,
        retry: (failureCount: number, error: unknown): boolean => {
          if (error && typeof error === 'object' && 'response' in error) {
            const status = (error as { response?: { status?: number } }).response?.status;
            if (status === 401 || status === 403 || status === 404) {
              return false;
            }
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}
