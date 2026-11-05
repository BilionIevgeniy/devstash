# Homepage Spec

> Adapted to our architecture (paths: `context/architecture-rules.md`, "Old paths in specs"). The course wording is kept in `/Users/ievgenbilion/Programming/Projects/Devstash/featuresDRAFT.original/`. Changed requirements are marked `[changed: ...]`.

## Overview

Convert the static HTML prototype (`prototypes/homepage/`) into the actual Next.js app homepage at `src/app/(marketing)/page.tsx`. Move the current `src/app/page.tsx` there instead of keeping two pages for `/` `[changed: course: src/app/page.tsx]`. Faithfully reproduce the design, layout, and animations using Tailwind CSS and shadcn/ui components.

## Sections

1. **Navbar** - Fixed top nav with logo, Features/Pricing anchor links, Sign In/Get Started buttons, mobile hamburger menu
2. **Hero** - Headline with gradient text, subtitle, CTA buttons, chaos-to-dashboard visual (floating icons -> arrow -> dashboard mockup)
3. **Features** - 6 feature cards in a 3-column grid (Code Snippets, AI Prompts, Instant Search, Commands, Files & Docs, Collections)
4. **AI Section** - Split layout: left side has Pro badge, headline, checklist; right side has code editor mockup with AI-generated tags
5. **Pricing** - Monthly/yearly toggle, Free and Pro pricing cards with feature lists
6. **CTA** - Final call-to-action with headline and button
7. **Footer** - Brand column, Product/Resources/Company link columns, copyright with dynamic year

## Component Breakdown

The homepage is one route, so its components live next to it in `src/app/(marketing)/_components/` and not in a feature or in `src/components/` (which holds shadcn primitives only) `[changed: architecture-rules, course: src/components/homepage/]`.

### Server Components (no `'use client'`)

- `src/app/(marketing)/page.tsx` - Page shell, composes all sections
- `src/app/(marketing)/_components/FeaturesSection.tsx` - Static feature cards grid
- `src/app/(marketing)/_components/AISection.tsx` - AI feature showcase with code mockup
- `src/app/(marketing)/_components/CTASection.tsx` - Final call-to-action
- `src/app/(marketing)/_components/Footer.tsx` - Footer with link columns
- `src/app/(marketing)/_components/HeroSection.tsx` - Hero text and visual; ChaosAnimation is its client leaf `[changed: server, course: client]`
- `src/app/(marketing)/_components/DashboardPreview.tsx` - Static mini-dashboard mockup `[changed: server, course: client]`

### Client Components (`'use client'`)

- `src/app/(marketing)/_components/Navbar.tsx` - Scroll background effect, mobile menu toggle
- `src/app/(marketing)/_components/ChaosAnimation.tsx` - Floating icons with requestAnimationFrame, mouse repulsion, bounce physics
- `src/app/(marketing)/_components/PricingSection.tsx` - Monthly/yearly billing toggle, dynamic price display
- `src/app/(marketing)/_components/ScrollFadeIn.tsx` - Reusable wrapper that uses IntersectionObserver to add fade-in-up animation on scroll

## Links & Navigation

| Element | Destination |
|---------|-------------|
| Logo | `/` |
| Features link | `#features` (anchor scroll) |
| Pricing link | `#pricing` (anchor scroll) |
| Sign In | `/sign-in` |
| Get Started / Get Started Free | `/register` |
| Go Pro (Pro card) `[changed: no trial exists, course: Start Free Trial]` | `/register` |
| See Features (hero) | `#features` (anchor scroll) |

## Technical Notes

- Use Lucide React icons (already installed) instead of inline SVGs where possible
- Use `Link` from `next/link` for internal routes, plain `<a>` for anchor links
- Gradient text: use a shared `gradient-text` utility class or inline Tailwind (`bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent`)
- Navbar scroll effect: track `window.scrollY` in a `useEffect`, toggle background opacity/border classes
- Chaos animation: port the prototype's `requestAnimationFrame` loop into a `useEffect` with ref-based state to avoid re-renders. Clean up on unmount
- `ScrollFadeIn` component: wrap each section's content, uses IntersectionObserver with `threshold: 0.1` to trigger a CSS transition (opacity 0->1, translateY 24px->0)
- Pricing toggle: `useState` for `isYearly`, swap `$8/month` to `$6/month (billed $72/yr)`
- Prices and limits come from `billing/domain/limits.ts` `[changed: billing exists, course: literals]`
- Mobile menu: `useState` for open/close, hide desktop nav links and show hamburger below `md` breakpoint
- Use shadcn `Button` component with `variant="default"` for primary and `variant="outline"` for ghost buttons
- Footer year: just use `{new Date().getFullYear()}` inline (server component renders current year)
- Add `scroll-smooth` to the html/body via globals.css or layout

## Styling

- All Tailwind, matching the dark theme from the prototype (dark backgrounds, muted text, blue gradient accents)
- Use existing CSS variables from `globals.css` where applicable (item type colors, etc.)
- Feature card accent colors via inline styles or Tailwind arbitrary values
- Responsive: 3-col -> 2-col -> 1-col for features grid, side-by-side -> stacked for AI section, etc.
- Keep the prototype's spacing and sizing as closely as reasonable with Tailwind utilities

## References

- `prototypes/homepage/index.html` - Structure
- `prototypes/homepage/styles.css` - Styling reference
- `prototypes/homepage/script.js` - Animation/interactivity logic
- `context/screenshots/` - Homepage prototype screenshots
