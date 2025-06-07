import React from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional

interface QueryProviderProps {
  children: React.ReactNode;
}

// Create a client
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Global error handling for queries
      console.error(`Query Error: ${query.queryKey}`, error);
      // TODO: Add user notification (e.g., toast)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Global error handling for mutations
      console.error(`Mutation Error: ${mutation.options.mutationKey || 'unknown'}`, error);
      // TODO: Add user notification
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error: any) => {
        // Do not retry on 4xx errors (auth, not found, etc.)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3; // Retry up to 3 times for other errors
      },
      refetchOnWindowFocus: process.env.NODE_ENV === 'production', // Only in prod
    },
  },
});

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
};

export default QueryProvider;
