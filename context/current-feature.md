# Current Feature: Homepage

## Status

In Progress

## Goals

- Turn the static prototype (`prototypes/homepage/`) into the real homepage at `src/app/(marketing)/page.tsx`, keeping its design, layout and animations, built with Tailwind and shadcn/ui
- Move `src/app/page.tsx` into `(marketing)` so `/` has one page, not two
- Build all seven sections: Navbar, Hero, Features, AI Section, Pricing, CTA, Footer
- Keep components in `src/app/(marketing)/_components/`, server by default: HeroSection, DashboardPreview, FeaturesSection, AISection, CTASection and Footer are server components
- Client components only where needed: Navbar (scroll effect, mobile menu), ChaosAnimation (requestAnimationFrame loop, mouse repulsion, bounce physics, cleaned up on unmount), PricingSection (monthly/yearly toggle), ScrollFadeIn (IntersectionObserver, threshold 0.1)
- Links work: logo to `/`, Features and Pricing to anchors, Sign In to `/sign-in`, every Get Started and Go Pro to `/register`
- Responsive: features grid 3 to 2 to 1 columns, AI section stacks, hamburger menu below `md`

## Notes

- Spec: `context/features/homepage-spec.md`. References: `prototypes/homepage/` (`index.html`, `styles.css`, `script.js`) and `context/screenshots/homepage-*.png`
- `src/app/page.tsx` is a placeholder (`<h1>devstash</h1>`), so the move loses nothing. `src/app/(marketing)/` does not exist yet
- Pricing toggle: `$8/month` becomes `$6/month (billed $72/yr)`
- Prices and Free limits live in `billing/domain/limits.ts`, with the yearly derivation tested there. Nothing enforces the limits yet
- Pro card button is "Go Pro": no trial exists. Footer entries with no page are plain text
- Lucide icons where possible, `next/link` for routes, plain `<a>` for anchors, shadcn `Button` (`default` and `outline`)
- Footer year: `{new Date().getFullYear()}` inline
- Add `scroll-smooth` through `globals.css` or the layout; add the gradient text as a shared `gradient-text` utility or inline Tailwind

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
