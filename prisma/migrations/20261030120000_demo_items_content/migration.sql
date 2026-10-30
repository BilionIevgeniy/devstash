-- Replace the demo user's items, tags and collections with real-world content.
-- Does not depend on what the demo user has now; a no-op when the user does not exist.
-- Ids are cuid-shaped ('c' + 24 lowercase hex chars), not UUIDs: the app validates
-- item ids with z.cuid2(), which allows only [0-9a-z].

-- Remove the old demo content (ItemTag and ItemCollection go with it by cascade)
DELETE FROM "Item" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" = 'demo@devstash.io');
DELETE FROM "Tag" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" = 'demo@devstash.io');
DELETE FROM "Collection" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" = 'demo@devstash.io');

-- Collections
INSERT INTO "Collection" ("id", "name", "description", "isFavorite", "userId", "createdAt", "updatedAt")
SELECT 'c' || substr(md5(gen_random_uuid()::text), 1, 24), c.name, c.description, c.is_favorite, u."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('React Patterns', 'Hooks, providers and data-fetching patterns for React', true),
  ('Python Snippets', 'Reusable Python utilities', false),
  ('Context Files', 'Prompts, templates and configs to give AI tools context', true),
  ('Interview Prep', 'Patterns and queries that come up in interviews', false),
  ('Git Commands', 'Everyday git workflows and how to undo them', true),
  ('AI Prompts', 'Prompts for reviewing, explaining and testing code', false),
  ('DevOps', 'Docker, CI, deploys and database migrations', false)
) AS c(name, description, is_favorite)
JOIN "User" u ON u."email" = 'demo@devstash.io';

-- Items
INSERT INTO "Item" ("id", "title", "contentType", "content", "url", "description", "isFavorite", "isPinned", "language", "userId", "typeId", "createdAt", "updatedAt")
SELECT 'c' || substr(md5(gen_random_uuid()::text), 1, 24), v.title, v.content_type, v.content, v.url, v.description, v.is_favorite, v.is_pinned, v.language, u."id", t."id", v.created_at, CURRENT_TIMESTAMP
FROM (VALUES
  ('useAuth Hook', 'snippet', 'TEXT', $c$import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
}$c$, NULL, 'Auth context with a provider and a typed hook that fails loudly outside it', true, true, 'typescript', TIMESTAMP '2024-01-15'),

  ('API Error Handling Pattern', 'snippet', 'TEXT', $c$interface RetryOptions {
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
if (!res.ok) throw new Error(`Request failed: ${res.status}`);$c$, NULL, 'Fetch wrapper with exponential backoff retry logic', true, true, 'typescript', TIMESTAMP '2024-01-14'),

  ('useLocalStorage Hook', 'snippet', 'TEXT', $c$import { useCallback, useEffect, useState } from "react";

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
const [theme, setTheme] = useLocalStorage<"dark" | "light">("theme", "dark");$c$, NULL, 'Typed, SSR-safe state persisted in localStorage', false, false, 'typescript', TIMESTAMP '2024-01-11'),

  ('React Query Setup', 'snippet', 'TEXT', $c$"use client";

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
}$c$, NULL, 'TanStack Query client with sensible defaults and devtools', false, false, 'typescript', TIMESTAMP '2024-01-06'),

  ('GitHub Actions Workflow', 'snippet', 'TEXT', $c$name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
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
      - run: npm run build$c$, NULL, 'CI workflow: type-check, lint, test and build on every push and PR', false, false, 'yaml', TIMESTAMP '2024-01-05'),

  ('Python Retry Decorator', 'snippet', 'TEXT', $c$import functools
import logging
import random
import time
from typing import Callable, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")

logger = logging.getLogger(__name__)


def retry(
    exceptions: tuple[type[Exception], ...] = (Exception,),
    attempts: int = 3,
    base_delay: float = 0.5,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Retry a function with exponential backoff and jitter."""

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for attempt in range(1, attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as error:
                    if attempt == attempts:
                        raise
                    delay = base_delay * 2 ** (attempt - 1) + random.uniform(0, 0.1)
                    logger.warning(
                        "%s failed (%s), retry %d in %.2fs",
                        func.__name__, error, attempt, delay,
                    )
                    time.sleep(delay)
            raise AssertionError("unreachable")

        return wrapper

    return decorator


@retry(exceptions=(ConnectionError, TimeoutError), attempts=5)
def fetch_report(report_id: str) -> dict:
    ...$c$, NULL, 'Typed decorator that retries a function with exponential backoff', true, false, 'python', TIMESTAMP '2024-01-22'),

  ('Settings from Environment', 'snippet', 'TEXT', $c$import os
from dataclasses import dataclass, field


class ConfigError(RuntimeError):
    pass


def require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ConfigError(f"Missing required environment variable: {name}")
    return value


def flag(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).lower() in {"1", "true", "yes"}


@dataclass(frozen=True)
class Settings:
    database_url: str = field(default_factory=lambda: require("DATABASE_URL"))
    redis_url: str = field(default_factory=lambda: os.environ.get("REDIS_URL", "redis://localhost:6379"))
    debug: bool = field(default_factory=lambda: flag("DEBUG"))
    workers: int = field(default_factory=lambda: int(os.environ.get("WORKERS", "4")))


# Fails fast at startup when a required variable is missing
settings = Settings()$c$, NULL, 'Frozen dataclass that reads and validates environment variables', false, false, 'python', TIMESTAMP '2024-01-21'),

  ('Top N per Group', 'snippet', 'TEXT', $c$-- Top 3 best-selling products in every category over the last 30 days
WITH ranked AS (
  SELECT
    p.category_id,
    p.id AS product_id,
    p.name,
    SUM(oi.quantity) AS units_sold,
    ROW_NUMBER() OVER (
      PARTITION BY p.category_id
      ORDER BY SUM(oi.quantity) DESC, p.id
    ) AS rank_in_category
  FROM products p
  JOIN order_items oi ON oi.product_id = p.id
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY p.category_id, p.id, p.name
)
SELECT category_id, product_id, name, units_sold
FROM ranked
WHERE rank_in_category <= 3
ORDER BY category_id, rank_in_category;$c$, NULL, 'Window function query: the top rows of every group in one pass', false, false, 'sql', TIMESTAMP '2024-01-20'),

  ('Safe Deploy Script', 'snippet', 'TEXT', $c$#!/usr/bin/env bash
# Deploy the current branch: pull, install, migrate, build, restart, health check
set -euo pipefail

APP_DIR="/srv/app"
HEALTH_URL="http://localhost:3000/api/health"

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[deploy]\033[0m %s\n' "$*" >&2; exit 1; }

cd "$APP_DIR"

[[ -z "$(git status --porcelain)" ]] || fail "Working tree is dirty, commit or stash first"

log "Pulling latest changes"
git pull --ff-only

log "Installing dependencies"
npm ci

log "Running migrations"
npx prisma migrate deploy

log "Building"
npm run build

log "Restarting service"
sudo systemctl restart app

log "Waiting for health check"
for _ in {1..10}; do
  if curl -fsS "$HEALTH_URL" > /dev/null; then
    log "Deployed $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 3
done

fail "Health check failed after 30s, see: journalctl -u app -n 100"$c$, NULL, 'Bash deploy script that stops on the first error and checks health', false, false, 'bash', TIMESTAMP '2024-01-19'),

  ('git reset --hard HEAD~1', 'command', 'TEXT', $c$# Drop the last commit AND its changes
git reset --hard HEAD~1

# Safer: drop the commit but keep its changes staged
git reset --soft HEAD~1

# Drop the commit and keep the changes unstaged in the working tree
git reset --mixed HEAD~1

# Lost a commit after a hard reset? Find it in the reflog and restore it
git reflog
git reset --hard HEAD@{1}

# Already pushed? Revert instead of rewriting shared history
git revert HEAD$c$, NULL, 'Undo the last commit, and how to get it back', false, false, 'bash', TIMESTAMP '2024-01-12'),

  ('Interactive Rebase Workflow', 'command', 'TEXT', $c$# Update main and replay your branch on top of it
git fetch origin
git rebase origin/main

# Squash, reorder or reword the last 5 commits
git rebase -i HEAD~5
#   pick   = keep the commit
#   reword = change the message
#   squash = merge into the previous commit
#   fixup  = like squash, but drop this message
#   drop   = remove the commit

# Record a fix for an earlier commit, then fold it in automatically
git commit --fixup=<sha>
git rebase -i --autosquash origin/main

# After resolving a conflict, continue (or give up and go back)
git add .
git rebase --continue
git rebase --abort

# Push the rewritten branch without overwriting someone else's commits
git push --force-with-lease$c$, NULL, 'Rebase onto main, clean up commits and push safely', true, true, 'bash', TIMESTAMP '2024-01-18'),

  ('Docker Compose Up', 'command', 'TEXT', $c$# Build images and start every service in the background
docker compose up -d --build

# Follow the logs of one service
docker compose logs -f --tail=100 api

# Rebuild and restart one service without touching the others
docker compose up -d --build --no-deps api

# Open a shell inside a running container
docker compose exec api sh

# Stop everything and remove volumes (wipes the database!)
docker compose down -v$c$, NULL, 'Start, inspect and tear down a Compose stack', true, false, 'bash', TIMESTAMP '2024-01-10'),

  ('Docker Cleanup', 'command', 'TEXT', $c$# See how much space images, containers, volumes and build cache take
docker system df

# Remove stopped containers, unused networks, dangling images and build cache
docker system prune

# Also remove every image no container uses (frees the most space)
docker system prune -a

# Remove unused volumes (check the list first: this deletes data)
docker volume ls -f dangling=true
docker volume prune

# Clear only build cache older than a week
docker builder prune --filter until=168h$c$, NULL, 'Free disk space taken by Docker, from safe to aggressive', false, false, 'bash', TIMESTAMP '2024-01-17'),

  ('Kill Process on Port', 'command', 'TEXT', $c$# Who is listening on port 3000?
lsof -i :3000

# Kill it (macOS / Linux)
kill -9 $(lsof -t -i :3000)

# Linux alternative without lsof
fuser -k 3000/tcp

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process$c$, NULL, 'Free a port held by a stuck dev server', false, false, 'bash', TIMESTAMP '2024-01-16'),

  ('Prisma Migration Command', 'command', 'TEXT', $c$# Create a migration from schema changes and apply it to the dev database
npx prisma migrate dev --name add_user_preferences

# Create the migration file only, to edit the SQL before applying it
npx prisma migrate dev --create-only --name backfill_slugs

# Check that the database and the migrations folder are in sync
npx prisma migrate status

# Apply pending migrations in production (never migrate dev there)
npx prisma migrate deploy

# Regenerate the client after pulling a schema change
npx prisma generate$c$, NULL, 'Create, check and deploy Prisma migrations', false, false, 'bash', TIMESTAMP '2024-01-07'),

  ('Code Review Prompt', 'prompt', 'TEXT', $c$You are a senior engineer reviewing a pull request. Review the code below.

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
{{paste the diff or the file}}$c$, NULL, 'Structured AI code review: bugs, security, performance, readability', false, false, NULL, TIMESTAMP '2024-01-13'),

  ('Explain Code Prompt', 'prompt', 'TEXT', $c$Explain the code below to a developer who knows {{language}} but has never seen this codebase.

Structure the answer as:
1. Summary: what the code does and why it exists, in 2-3 sentences
2. Walkthrough: go through it block by block, in the order it runs
3. Key concepts: name each pattern, algorithm or library feature it relies on and explain it briefly
4. Gotchas: anything surprising, fragile or easy to break when changing it
5. Example: one concrete input and what happens to it, step by step

Keep it plain: no filler, and do not repeat the code back line by line.
If something is ambiguous without more context, say what you would need to know.

Code:
{{paste code}}$c$, NULL, 'Step-by-step explanation of unfamiliar code', false, false, NULL, TIMESTAMP '2024-01-09'),

  ('Write Unit Tests Prompt', 'prompt', 'TEXT', $c$Write unit tests for the function below using {{Vitest / Jest / pytest}}.

Requirements:
- Cover the happy path, boundaries (0, 1, max, empty), invalid input and error paths
- One behaviour per test; name each test after the rule it pins, e.g. "rejects an expired token"
- Use table-driven tests (it.each / parametrize) when cases differ only by data
- Mock only real boundaries (network, database, clock), never the code under test
- Pass time in explicitly or use fake timers; tests must not depend on today's date
- No snapshot tests

Before the code, list the cases in a short table: case | input | expected.
After the code, list any behaviour that looks like a bug instead of writing a test that pins it.

Function:
{{paste code}}$c$, NULL, 'Thorough unit tests with edge cases and minimal mocking', true, false, NULL, TIMESTAMP '2024-01-08'),

  ('Meeting Notes Template', 'note', 'TEXT', $c$# {{Meeting title}}

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

- {{question}}$c$, NULL, 'Markdown template with decisions and action items', false, false, 'markdown', TIMESTAMP '2024-01-04'),

  ('Tailwind CSS Resources', 'link', 'URL', NULL, 'https://tailwindcss.com/docs', 'Official Tailwind CSS documentation', true, false, NULL, TIMESTAMP '2024-01-03')
) AS v(title, type_name, content_type, content, url, description, is_favorite, is_pinned, language, created_at)
JOIN "User" u ON u."email" = 'demo@devstash.io'
JOIN "ItemType" t ON t."name" = v.type_name AND t."isSystem" = true AND t."userId" IS NULL;

-- Tags, created from the same list that links them to items
WITH demo AS (
  SELECT "id" FROM "User" WHERE "email" = 'demo@devstash.io'
),
item_tags(title, tags) AS (VALUES
  ('useAuth Hook', ARRAY['react', 'auth', 'hooks']),
  ('API Error Handling Pattern', ARRAY['api', 'error-handling', 'typescript']),
  ('useLocalStorage Hook', ARRAY['react', 'hooks', 'storage']),
  ('React Query Setup', ARRAY['react', 'data-fetching']),
  ('GitHub Actions Workflow', ARRAY['ci-cd', 'github']),
  ('Python Retry Decorator', ARRAY['python', 'error-handling', 'decorators']),
  ('Settings from Environment', ARRAY['python', 'config']),
  ('Top N per Group', ARRAY['sql', 'database', 'interview']),
  ('Safe Deploy Script', ARRAY['bash', 'devops', 'ci-cd']),
  ('git reset --hard HEAD~1', ARRAY['git', 'reset']),
  ('Interactive Rebase Workflow', ARRAY['git', 'rebase']),
  ('Docker Compose Up', ARRAY['docker', 'devops']),
  ('Docker Cleanup', ARRAY['docker', 'devops']),
  ('Kill Process on Port', ARRAY['bash', 'networking']),
  ('Prisma Migration Command', ARRAY['prisma', 'database']),
  ('Code Review Prompt', ARRAY['ai', 'code-review']),
  ('Explain Code Prompt', ARRAY['ai', 'learning']),
  ('Write Unit Tests Prompt', ARRAY['ai', 'testing']),
  ('Meeting Notes Template', ARRAY['template', 'meetings']),
  ('Tailwind CSS Resources', ARRAY['css', 'docs'])
),
new_tags AS (
  INSERT INTO "Tag" ("id", "name", "userId")
  SELECT 'c' || substr(md5(gen_random_uuid()::text), 1, 24), names.name, demo."id"
  FROM (SELECT DISTINCT unnest(tags) AS name FROM item_tags) AS names
  CROSS JOIN demo
  RETURNING "id", "name", "userId"
)
INSERT INTO "ItemTag" ("itemId", "tagId")
SELECT i."id", nt."id"
FROM item_tags it
CROSS JOIN LATERAL unnest(it.tags) AS tag_name
JOIN new_tags nt ON nt."name" = tag_name
JOIN "Item" i ON i."userId" = nt."userId" AND i."title" = it.title;

-- Items in collections
INSERT INTO "ItemCollection" ("itemId", "collectionId")
SELECT i."id", c."id"
FROM (VALUES
  ('useAuth Hook', ARRAY['React Patterns', 'Interview Prep']),
  ('API Error Handling Pattern', ARRAY['React Patterns']),
  ('useLocalStorage Hook', ARRAY['React Patterns']),
  ('React Query Setup', ARRAY['React Patterns']),
  ('GitHub Actions Workflow', ARRAY['DevOps', 'Context Files']),
  ('Python Retry Decorator', ARRAY['Python Snippets']),
  ('Settings from Environment', ARRAY['Python Snippets']),
  ('Top N per Group', ARRAY['Interview Prep']),
  ('Safe Deploy Script', ARRAY['DevOps']),
  ('git reset --hard HEAD~1', ARRAY['Git Commands']),
  ('Interactive Rebase Workflow', ARRAY['Git Commands']),
  ('Docker Compose Up', ARRAY['DevOps']),
  ('Docker Cleanup', ARRAY['DevOps']),
  ('Kill Process on Port', ARRAY['DevOps']),
  ('Prisma Migration Command', ARRAY['DevOps']),
  ('Code Review Prompt', ARRAY['AI Prompts', 'Context Files']),
  ('Explain Code Prompt', ARRAY['AI Prompts', 'Interview Prep']),
  ('Write Unit Tests Prompt', ARRAY['AI Prompts']),
  ('Meeting Notes Template', ARRAY['Context Files']),
  ('Tailwind CSS Resources', ARRAY['React Patterns'])
) AS ic(title, collections)
CROSS JOIN LATERAL unnest(ic.collections) AS collection_name
JOIN "User" u ON u."email" = 'demo@devstash.io'
JOIN "Item" i ON i."userId" = u."id" AND i."title" = ic.title
JOIN "Collection" c ON c."userId" = u."id" AND c."name" = collection_name;
