"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

import { createQueryClient } from "@/components/common/query-client";

interface QueryProviderProps {
  children: ReactNode;
}

// The cache of what the browser fetches itself (ADR 0025). One client per
// mount of the (app) layout, never a module singleton: leaving the layout
// (a sign-out) drops every cached list and detail with it. The devtools
// render nothing outside development; their button sits bottom right, away
// from the user menu at the foot of the sidebar.
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </QueryClientProvider>
  );
}
