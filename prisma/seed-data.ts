import { DEMO_PRO_USER_EMAIL, DEMO_USER_EMAIL } from "./demo-user";

export interface SeedItemType {
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export interface SeedCollection {
  name: string;
  description: string;
  isFavorite: boolean;
  updatedAt?: Date;
}

export interface SeedItem {
  title: string;
  contentType: "TEXT" | "URL";
  content: string | null;
  url?: string;
  description: string;
  isFavorite: boolean;
  isPinned: boolean;
  language: string | null;
  typeName: string;
  collectionNames: string[];
  tags: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export const demoUser = {
  email: DEMO_USER_EMAIL,
  name: "John Doe",
};

export const demoProUser = {
  email: DEMO_PRO_USER_EMAIL,
  name: "Jane Doe",
};

export const systemItemTypes: SeedItemType[] = [
  { name: "snippet", slug: "snippets", icon: "Code", color: "#3b82f6" },
  { name: "prompt", slug: "prompts", icon: "Sparkles", color: "#8b5cf6" },
  { name: "command", slug: "commands", icon: "Terminal", color: "#f97316" },
  { name: "note", slug: "notes", icon: "StickyNote", color: "#fde047" },
  { name: "file", slug: "files", icon: "File", color: "#6b7280" },
  { name: "image", slug: "images", icon: "Image", color: "#ec4899" },
  { name: "link", slug: "links", icon: "Link", color: "#10b981" },
];

// The demo user is on the Free plan and sits one short of both limits (50 items,
// 3 collections), so the next create passes and the one after it is refused.
export const demoCollections: SeedCollection[] = [
  {
    name: "React Patterns",
    description: "Hooks, providers and data-fetching patterns for React",
    isFavorite: true,
  },
];

export const demoItems: SeedItem[] = [
  {
    title: "useAuth Hook",
    contentType: "TEXT",
    content: `import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  async function signIn(email: string, password: string) {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Invalid email or password");
    setUser(await res.json());
  }

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}`,
    description:
      "Auth context with a provider and a typed hook that fails loudly outside it",
    isFavorite: true,
    isPinned: true,
    language: "typescript",
    typeName: "snippet",
    collectionNames: ["React Patterns", "Pagination Test"],
    tags: ["react", "auth", "hooks"],
    createdAt: new Date("2024-01-15"),
  },
  {
    title: "API Error Handling Pattern",
    contentType: "TEXT",
    content: `interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  { retries = 3, baseDelayMs = 500 }: RetryOptions = {},
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!RETRYABLE_STATUS.has(res.status) || attempt >= retries) {
        return res;
      }
    } catch (error) {
      // Network error: rethrow once the retries are used up
      if (attempt >= retries) throw error;
    }
    // Exponential backoff with jitter: 500ms, 1s, 2s... plus up to 100ms
    await sleep(baseDelayMs * 2 ** attempt + Math.random() * 100);
  }
}

// Usage
const res = await fetchWithRetry("/api/items", { method: "GET" }, { retries: 5 });
if (!res.ok) throw new Error(\`Request failed: \${res.status}\`);`,
    description: "Fetch wrapper with exponential backoff retry logic",
    isFavorite: true,
    isPinned: true,
    language: "typescript",
    typeName: "snippet",
    collectionNames: ["React Patterns"],
    tags: ["api", "error-handling", "typescript"],
    createdAt: new Date("2024-01-14"),
  },
  {
    title: "Code Review Prompt",
    contentType: "TEXT",
    content: `You are a senior engineer reviewing a pull request. Review the code below.

Focus on, in this order:
1. Bugs and logic errors, including edge cases (empty input, null, concurrency, time zones)
2. Security: injection, missing auth checks, unvalidated input, secrets in code
3. Performance: N+1 queries, unnecessary re-renders, work repeated inside loops
4. Readability: naming, functions that do too much, missing types

Rules:
- Report only real problems. Skip style issues a formatter would fix
- For every finding give the line, why it is a problem and a concrete fix as code
- Order findings from most to least severe and label each one critical, major or minor
- If the code is fine, say so in one sentence

Context: {{what the change does and the stack, e.g. Next.js + Prisma}}

Code:
{{paste the diff or the file}}`,
    description:
      "Structured AI code review: bugs, security, performance, readability",
    isFavorite: false,
    isPinned: false,
    language: null,
    typeName: "prompt",
    collectionNames: [],
    tags: ["ai", "code-review"],
    createdAt: new Date("2024-01-13"),
  },
  {
    title: "git reset --hard HEAD~1",
    contentType: "TEXT",
    content: `# Drop the last commit AND its changes
git reset --hard HEAD~1

# Safer: drop the commit but keep its changes staged
git reset --soft HEAD~1

# Drop the commit and keep the changes unstaged in the working tree
git reset --mixed HEAD~1

# Lost a commit after a hard reset? Find it in the reflog and restore it
git reflog
git reset --hard HEAD@{1}

# Already pushed? Revert instead of rewriting shared history
git revert HEAD`,
    description: "Undo the last commit, and how to get it back",
    isFavorite: false,
    isPinned: false,
    language: "bash",
    typeName: "command",
    collectionNames: [],
    tags: ["git", "reset"],
    createdAt: new Date("2024-01-12"),
  },
  {
    title: "useLocalStorage Hook",
    contentType: "TEXT",
    content: `import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage disabled: keep the in-memory value
    }
  }, [key, value]);

  const remove = useCallback(() => {
    window.localStorage.removeItem(key);
    setValue(initialValue);
  }, [key, initialValue]);

  return [value, setValue, remove] as const;
}

// Usage
const [theme, setTheme] = useLocalStorage<"dark" | "light">("theme", "dark");`,
    description: "Typed, SSR-safe state persisted in localStorage",
    isFavorite: false,
    isPinned: false,
    language: "typescript",
    typeName: "snippet",
    collectionNames: ["React Patterns"],
    tags: ["react", "hooks", "storage"],
    createdAt: new Date("2024-01-11"),
  },
  {
    title: "Docker Compose Up",
    contentType: "TEXT",
    content: `# Build images and start every service in the background
docker compose up -d --build

# Follow the logs of one service
docker compose logs -f --tail=100 api

# Rebuild and restart one service without touching the others
docker compose up -d --build --no-deps api

# Open a shell inside a running container
docker compose exec api sh

# Stop everything and remove volumes (wipes the database!)
docker compose down -v`,
    description: "Start, inspect and tear down a Compose stack",
    isFavorite: true,
    isPinned: false,
    language: "bash",
    typeName: "command",
    collectionNames: [],
    tags: ["docker", "devops"],
    createdAt: new Date("2024-01-10"),
  },
  {
    title: "Explain Code Prompt",
    contentType: "TEXT",
    content: `Explain the code below to a developer who knows {{language}} but has never seen this codebase.

Structure the answer as:
1. Summary: what the code does and why it exists, in 2-3 sentences
2. Walkthrough: go through it block by block, in the order it runs
3. Key concepts: name each pattern, algorithm or library feature it relies on and explain it briefly
4. Gotchas: anything surprising, fragile or easy to break when changing it
5. Example: one concrete input and what happens to it, step by step

Keep it plain: no filler, and do not repeat the code back line by line.
If something is ambiguous without more context, say what you would need to know.

Code:
{{paste code}}`,
    description: "Step-by-step explanation of unfamiliar code",
    isFavorite: false,
    isPinned: false,
    language: null,
    typeName: "prompt",
    collectionNames: [],
    tags: ["ai", "learning"],
    createdAt: new Date("2024-01-09"),
  },
  {
    title: "Prisma Migration Command",
    contentType: "TEXT",
    content: `# Create a migration from schema changes and apply it to the dev database
npx prisma migrate dev --name add_user_preferences

# Create the migration file only, to edit the SQL before applying it
npx prisma migrate dev --create-only --name backfill_slugs

# Check that the database and the migrations folder are in sync
npx prisma migrate status

# Apply pending migrations in production (never migrate dev there)
npx prisma migrate deploy

# Regenerate the client after pulling a schema change
npx prisma generate`,
    description: "Create, check and deploy Prisma migrations",
    isFavorite: false,
    isPinned: false,
    language: "bash",
    typeName: "command",
    collectionNames: [],
    tags: ["prisma", "database"],
    createdAt: new Date("2024-01-07"),
  },
  {
    title: "React Query Setup",
    contentType: "TEXT",
    content: `"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // One client per browser session, never shared between server requests
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}`,
    description: "TanStack Query client with sensible defaults and devtools",
    isFavorite: false,
    isPinned: false,
    language: "typescript",
    typeName: "snippet",
    collectionNames: ["React Patterns"],
    tags: ["react", "data-fetching"],
    createdAt: new Date("2024-01-06"),
  },
  {
    title: "GitHub Actions Workflow",
    contentType: "TEXT",
    content: `name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run test
      - run: npm run build`,
    description:
      "CI workflow: type-check, lint, test and build on every push and PR",
    isFavorite: false,
    isPinned: false,
    language: "yaml",
    typeName: "snippet",
    collectionNames: [],
    tags: ["ci-cd", "github"],
    createdAt: new Date("2024-01-05"),
  },
  {
    title: "Meeting Notes Template",
    contentType: "TEXT",
    content: `# {{Meeting title}}

**Date:** {{YYYY-MM-DD}}
**Attendees:** {{names}}
**Facilitator:** {{name}}

## Goal

What we need to decide or learn by the end of this meeting.

## Agenda

1. {{topic}} ({{owner}}, 10 min)
2. {{topic}} ({{owner}}, 15 min)

## Decisions

| Decision | Why | Owner |
| -------- | --- | ----- |
| {{decision}} | {{reason}} | {{name}} |

## Action items

- [ ] {{task}} - {{owner}} - due {{date}}

## Open questions

- {{question}}`,
    description: "Markdown template with decisions and action items",
    isFavorite: false,
    isPinned: false,
    language: "markdown",
    typeName: "note",
    collectionNames: [],
    tags: ["template", "meetings"],
    createdAt: new Date("2024-01-04"),
  },
  {
    title: "Tailwind CSS Resources",
    contentType: "URL",
    content: null,
    url: "https://tailwindcss.com/docs",
    description: "Official Tailwind CSS documentation",
    isFavorite: true,
    isPinned: false,
    language: null,
    typeName: "link",
    collectionNames: ["React Patterns"],
    tags: ["css", "docs"],
    createdAt: new Date("2024-01-03"),
  },
];
