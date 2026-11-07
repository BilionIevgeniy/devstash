import { DEMO_PRO_USER_EMAIL, DEMO_USER_EMAIL } from "./demo-user";

export interface SeedItemType {
  name: string;
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
  { name: "snippet", icon: "Code", color: "#3b82f6" },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6" },
  { name: "command", icon: "Terminal", color: "#f97316" },
  { name: "note", icon: "StickyNote", color: "#fde047" },
  { name: "file", icon: "File", color: "#6b7280" },
  { name: "image", icon: "Image", color: "#ec4899" },
  { name: "link", icon: "Link", color: "#10b981" },
];

// The demo user is on the Free plan and sits one short of both limits (50 items,
// 3 collections), so the next create passes and the one after it is refused.
export const demoCollections: SeedCollection[] = [
  {
    name: "React Patterns",
    description: "Common React patterns and hooks",
    isFavorite: true,
  },
];

export const demoItems: SeedItem[] = [
  {
    title: "useAuth Hook",
    contentType: "TEXT",
    content: "const useAuth = () => {\n  // Custom auth hook implementation\n}",
    description: "Custom authentication hook for React applications",
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
    content: "try {\n  // API call\n} catch (error) {\n  // Handle error\n}",
    description: "Fetch wrapper with exponential backoff retry logic",
    isFavorite: true,
    isPinned: true,
    language: "typescript",
    typeName: "snippet",
    collectionNames: ["React Patterns"],
    tags: ["api", "error-handling"],
    createdAt: new Date("2024-01-14"),
  },
  {
    title: "Code Review Prompt",
    contentType: "TEXT",
    content: "Review this code for security and performance issues...",
    description: "Prompt for AI code reviews",
    isFavorite: false,
    isPinned: false,
    language: null,
    typeName: "prompt",
    collectionNames: ["React Patterns"],
    tags: ["ai", "code-review"],
    createdAt: new Date("2024-01-13"),
  },
  {
    title: "git reset --hard HEAD~1",
    contentType: "TEXT",
    content: "git reset --hard HEAD~1",
    description: "Reset to previous commit (destructive)",
    isFavorite: false,
    isPinned: false,
    language: "bash",
    typeName: "command",
    collectionNames: ["React Patterns"],
    tags: ["git", "reset"],
    createdAt: new Date("2024-01-12"),
  },
  {
    title: "useLocalStorage Hook",
    contentType: "TEXT",
    content: "const useLocalStorage = (key, initialValue) => { ... }",
    description: "Persistent state management with localStorage",
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
    content: "docker-compose up -d --build",
    description: "Start containers in detached mode with rebuild",
    isFavorite: true,
    isPinned: false,
    language: "bash",
    typeName: "command",
    collectionNames: ["React Patterns"],
    tags: ["docker", "devops"],
    createdAt: new Date("2024-01-10"),
  },
  {
    title: "Explain Code Prompt",
    contentType: "TEXT",
    content: "Explain this code step by step, highlighting key concepts...",
    description: "AI prompt for code explanations",
    isFavorite: false,
    isPinned: false,
    language: null,
    typeName: "prompt",
    collectionNames: ["React Patterns"],
    tags: ["ai", "learning"],
    createdAt: new Date("2024-01-09"),
  },
  {
    title: "Meeting Notes Template",
    contentType: "TEXT",
    content:
      "# Meeting Notes\n\n## Date:\n## Attendees:\n## Agenda:\n## Action Items:",
    description: "Markdown template for meeting notes",
    isFavorite: false,
    isPinned: false,
    language: "markdown",
    typeName: "note",
    collectionNames: ["React Patterns"],
    tags: ["template", "meetings"],
    createdAt: new Date("2024-01-08"),
  },
  {
    title: "Prisma Migration Command",
    contentType: "TEXT",
    content: "npx prisma migrate dev --name migration_name",
    description: "Create and apply Prisma database migration",
    isFavorite: false,
    isPinned: false,
    language: "bash",
    typeName: "command",
    collectionNames: ["React Patterns"],
    tags: ["prisma", "database"],
    createdAt: new Date("2024-01-07"),
  },
  {
    title: "React Query Setup",
    contentType: "TEXT",
    content: "const queryClient = new QueryClient()",
    description: "TanStack Query client configuration",
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
    content: "name: CI\non: [push, pull_request]",
    description: "Basic CI/CD workflow template",
    isFavorite: false,
    isPinned: false,
    language: "yaml",
    typeName: "snippet",
    collectionNames: ["React Patterns"],
    tags: ["ci-cd", "github"],
    createdAt: new Date("2024-01-05"),
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
    createdAt: new Date("2024-01-04"),
  },
];
