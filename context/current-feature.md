# Current Feature: Homepage Mockup

## Status

In Progress

## Goals

- Static marketing homepage prototype in `prototypes/homepage/` with `index.html`, `styles.css`, `script.js`
- Dark theme using the app's item type colors: Snippet `#3b82f6`, Prompt `#8b5cf6`, Command `#f97316`, Note `#fde047`, File `#6b7280`, Image `#ec4899`, Link `#10b981`
- Fixed top nav: logo, Features/Pricing links, Sign In/Get Started buttons; gets more opaque on scroll
- Hero text: "Stop Losing Your Developer Knowledge" headline with gradient text, subheadline about scattered knowledge, CTA buttons
- Hero visual, "chaos to order", three elements side by side:
  - Chaos box "Your knowledge today...": 8 floating icons (Notion, GitHub, Slack, VS Code logos; browser tabs, terminal, text file, bookmark). requestAnimationFrame animation: drift, bounce off walls, subtle rotation and scale pulsing, repel from the mouse cursor
  - Center arrow with a CSS pulse animation
  - Box "...with DevStash": simplified dashboard mockup with a sidebar of nav items and a grid of item cards with colored top borders
- Features: 6 cards in a grid (Code Snippets, AI Prompts, Instant Search, Commands, Files & Docs, Collections), each in its item type accent color
- AI section, two columns: "Pro Feature" badge and checklist of AI capabilities; code editor mockup with an "AI Generated Tags" demo
- Pricing: Free ($0, 50 items, 3 collections) vs Pro ($8/mo, unlimited, AI features), Pro highlighted with a "Most Popular" badge, toggle for the yearly $72 option
- CTA: "Ready to Organize Your Knowledge?" with a button
- Footer: logo, link columns, copyright with the current year
- Elements fade in when scrolled into view
- Responsive: on mobile the chaos/arrow/dashboard stack vertically, grids go single column, the arrow rotates 90° to point down

## Notes

- Spec: `context/features/homepage-mockup-spec.md`
- This is a static prototype only (plain HTML, CSS, JS), not the Next.js page; the real homepage is planned at `src/app/(marketing)/`
- The spec ends with "give to UI-designer agent to make UI-friendly design": an independent agent in that role wrote the design brief
- Colors follow the app, not the spec's original palette (user's decision, the spec was updated). Instant Search takes Link emerald, Collections takes Note yellow; the brand accent is blue-violet, with no pink
- File and image uploads are Pro only, as `requiresPro` enforces, although `context/project-overview.md` lists image uploads under Free

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
