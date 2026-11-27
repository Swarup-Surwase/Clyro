# Clyro — AI Development Prompt Log

> **Privacy Notice:** This log records actual AI-assisted engineering interactions for Clyro. No real relief records, victim identifiers, or live credentials are ever pasted into AI tools or recorded in this file. All sample examples referenced are strictly synthetic.
>
> **Manual Additions:** If an external prompt or manual edit occurs outside an automated session, the developer should append an entry manually following the structure below.

---

## Entry 001 — Project Architecture, Core Engine, Workspace, Landing Experience, and Verification

- **Date and Time:** `2026-11-27 11:08–11:29 IST (+05:30)`
- **Actual Prompt (Master Specification):**
  > Master Development & Design Prompt for **Clyro** ("Save Lives. Share Help. Protect Identities.") referencing `SKILL.md` (M01–M17 mandatory privacy and PII sanitization requirements) and dark monochromatic + muted mint visual direction (`#050505` background, `#A8E6CF` accent). Build a complete browser-only PII sanitization engine (email, Indian phone, IPv4/IPv6, PAN, Aadhaar, Luhn-validated credit cards), three redaction modes (Full Mask, Partial Mask, Consistent Pseudonymization), CSV/TXT parsing and export, synthetic noisy sample loader, live side-by-side diff, organization-specific Safe Handover, Privacy Audit report, animated wireframe hero landing page, and automated unit + browser E2E privacy verification.
- **Task Objective:**
  1. Inspect empty repository and verify local Node/npm/Chrome toolchain.
  2. Scaffold Vite + React + TypeScript + Tailwind CSS v4 + Vitest + Playwright project with locally bundled fonts (`@fontsource/inter`, `@fontsource/jetbrains-mono`) and strict CSP (`connect-src 'none'`).
  3. Implement modular `src/engine/` PII detection, validators (Luhn, Verhoeff checksum labeling, strict IPv4, RFC 4291/5952 IPv6 parser), canonicalization, deterministic overlap resolution, redaction, pseudonymization, CSV parsing/export with optional spreadsheet formula neutralization, recipient handover policies, and count-only audit generation.
  4. Implement `/app` functional workspace (`Sanitizer`, `Safe Handover`, `Privacy Audit`, `How It Works`, `Privacy Guide`, `Settings`) with volatile memory state and Web Worker support (`>40,000` chars).
  5. Implement `/` cinematic dark landing page with animated HTML5 Canvas wireframe funnel and live engine-backed interactive demonstration.
  6. Verify all checks via Vitest, Playwright (Chromium), ESLint, TypeScript (`tsc -b`), Vite build, and visual screenshot inspection.
- **Files Changed:**
  - Config & Deployment: `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `vercel.json`, `index.html`, `public/favicon.svg`, `src/index.css`, `src/main.tsx`, `src/App.tsx`
  - Engine & Worker & Fixtures: `src/engine/types.ts`, `src/engine/validators.ts`, `src/engine/normalize.ts`, `src/engine/resolveOverlaps.ts`, `src/engine/detect.ts`, `src/engine/pseudonyms.ts`, `src/engine/redact.ts`, `src/engine/csv.ts`, `src/engine/policies.ts`, `src/engine/audit.ts`, `src/engine/index.ts`, `src/workers/sanitizer.worker.ts`, `src/fixtures/syntheticRelief.ts`, `src/utils/download.ts`
  - Hooks & Shared UI: `src/hooks/useRouter.tsx`, `src/hooks/useSanitizerStore.tsx`, `src/components/shared/ClyroLogo.tsx`, `src/components/shared/EntityMeta.tsx`
  - Workspace UI & Pages: `src/components/workspace/WorkspaceLayout.tsx`, `src/components/workspace/SafeHighlightedText.tsx`, `src/components/workspace/ModeAndFilterBar.tsx`, `src/components/workspace/DiffWorkspace.tsx`, `src/components/workspace/ReviewAndExportPanel.tsx`, `src/pages/Sanitizer.tsx`, `src/pages/Handover.tsx`, `src/pages/Audit.tsx`, `src/pages/HowItWorks.tsx`, `src/pages/PrivacyGuide.tsx`, `src/pages/Settings.tsx`
  - Landing UI: `src/components/animations/WireframeFunnelCanvas.tsx`, `src/components/landing/LandingNavbar.tsx`, `src/components/landing/InteractiveDemoSection.tsx`, `src/components/landing/LandingSections.tsx`, `src/pages/Landing.tsx`
  - Tests & Docs: `tests/unit/setup.ts`, `tests/unit/engine.detect.test.ts`, `tests/unit/engine.redact.test.ts`, `tests/unit/engine.csv.test.ts`, `tests/unit/engine.pipeline.test.ts`, `tests/unit/workspace.integration.test.tsx`, `tests/e2e/clyro.spec.ts`, `README.md`, `PROMPT_LOG.md`
- **Implementation Summary:**
  - Built 100% browser-only PII detection and redaction engine with zero external requests and zero persistent storage.
  - Corrected two bugs identified during automated/visual verification: added JSDOM shims for `IntersectionObserver`, `matchMedia`, and `HTMLCanvasElement.getContext` in `tests/unit/setup.ts`, adjusted Playwright network listener to allow only same-origin static GET assets (`/` , `/app`, `/favicon.svg`, `/assets/*`) while blocking any external or API/POST calls, and removed `transition-all` / transition delay from segmented mode buttons so active selection renders instantaneously without mid-transition fading.
- **Verification Commands & Actual Results:**
  - `npm run typecheck` (`tsc -b --noEmit`) → **Passed (exit 0, 0 errors)**
  - `npm run lint` (`eslint .`) → **Passed (exit 0, 0 errors, 0 warnings)**
  - `npm test` (`vitest run`) → **Passed (5 test files, 25/25 tests passing)**
  - `npm run build` (`tsc -b && vite build`) → **Passed (`dist/` built cleanly in 2.46s with bundled fonts and worker)**
  - `npm run test:e2e` (`playwright test` against `vite preview` at `http://127.0.0.1:4173`) → **Passed (2/2 E2E specs passing in 4.7s: complete user journey, byte-verified CSV & TXT downloads, Safe Handover scope tokens, Privacy Audit zero-PII JSON check, malformed CSV export blocking, zero `localStorage`/`sessionStorage`, zero CSP/console errors, zero non-static network requests, zero horizontal overflow across 360px/768px/1440px)**
- **Remaining Issues / Known Limitations:**
  - Pattern-based detectors do not cover personal names, street addresses, or unstructured medical notes (manual select-and-redact is provided for plain text).
  - Closed-tab offline relaunch without browser cache is not enabled by default because no custom Service Worker asset cache is registered.
  - Production bundle main JS chunk is `540.85 kB` (`161.38 kB` gzip); code-splitting is an optional future optimization.


---

## Entry 002 — Intro Fluted-Glass Shader & Scroll-Interactive Landing Experience

- **Date and Time:** `2026-11-27 11:38–11:46 IST (+05:30)`
- **Actual Prompt:**
  > "nice work. but make it interactive as much as you can but keep in mind to dont over exxagerate it and add an intro animation also to website, use given screen recorgind as a reference and make a visually appeling scroll based interactive yet fully working website" (with uploaded reference recording `Clyro_Intro_animation.mov`).
- **Task Objective:**
  1. Analyze the uploaded `Clyro_Intro_animation.mov` recording (radial concentric bloom expanding into vertical fluted-glass refraction louvers over `#050505`).
  2. Implement a restrained, local WebGL fragment shader (`PrivacyPrismShaderCanvas.tsx`) with 2D Canvas fallback, subtle pointer responsiveness, scroll coupling, `prefers-reduced-motion` support, and a one-click `Replay Intro` trigger — without blocking above-the-fold CTA access.
  3. Add scroll-linked and interactive capabilities across the landing sections: top scroll progress hairline, Raw Exposure vs. Clyro Handover toggle, editable live text & recipient scope switcher in `InteractiveDemoSection.tsx`, scroll-scrubbed pipeline progress track with a live Luhn/IPv4/IPv6 stage inspector in `LandingSections.tsx`, interactive Bento category/mode probes, live use-case column minimization previews, and interactive browser trust-boundary nodes.
- **Files Changed:**
  - `src/components/animations/PrivacyPrismShaderCanvas.tsx` (new)
  - `src/pages/Landing.tsx`
  - `src/components/landing/InteractiveDemoSection.tsx`
  - `src/components/landing/LandingSections.tsx`
  - `tests/e2e/clyro.spec.ts`
  - `PROMPT_LOG.md`
- **Verification Commands & Actual Results:**
  - `npm run typecheck` (`tsc -b --noEmit`) → **Passed (exit 0)**
  - `npm run lint` (`eslint .`) → **Passed (exit 0, 0 errors, 0 warnings)**
  - `npm test` (`vitest run`) → **Passed (5 test files, 25/25 tests passing)**
  - `npm run build` (`tsc -b && vite build`) → **Passed (`dist/` built cleanly in `1.74s`)**
  - `npm run test:e2e` (`playwright test` against `vite preview` at `http://127.0.0.1:4173`) → **Passed (2/2 E2E specs passing in `8.3s`, including live landing text redaction, Replay Intro, live Luhn probe, byte-verified exports, zero non-static egress, zero storage persistence, and responsive layouts across 360px/768px/1440px)**
- **Remaining Issues:**
  - None blocking; Vite dev server (`http://127.0.0.1:5173/`) remains active with HMR updates applied.


---

## Entry 003 — Dedicated Opening Intro Curtain Sequence (`IntroOverlay.tsx`)

- **Date and Time:** `2026-11-27 11:50–11:53 IST (+05:30)`
- **Actual Prompt:**
  > "make Intro man"
- **Task Objective:**
  1. Add a dedicated ~2.55s opening Intro overlay ([IntroOverlay.tsx](file:///Users/swarup/Documents/My%20Projects/Clyro/src/components/animations/IntroOverlay.tsx)) on `/` featuring the centered radial bloom -> symmetric vertical fluted-glass louver sweep matching `Clyro_Intro_animation.mov` around the centered Clyro wordmark and tagline.
  2. Keep access non-blocking via `Skip Intro →`, `Escape` / `Enter` / `Space`, wheel scroll dismissal, `prefers-reduced-motion` auto-skip, `Replay Intro` trigger, and zero delay on direct `/app` workspace routes.
- **Files Changed:**
  - `src/components/animations/IntroOverlay.tsx` (new)
  - `src/pages/Landing.tsx`
  - `tests/e2e/clyro.spec.ts`
  - `PROMPT_LOG.md`
- **Verification Commands & Actual Results:**
  - `npm run typecheck`, `npm run lint`, `npm test` (25/25 passing), `npm run build` (`1.94s`), and `npm run test:e2e` (2/2 Playwright specs passing in `10.3s`, capturing `landing-shader-bloom.png` and verifying `Skip Intro` + `Replay Intro`).
- **Remaining Issues:**
  - None.


---

## Entry 004 — Animated SVG README Assets & GitHub Repository Push

- **Date and Time:** `2026-11-27 12:00–12:06 IST (+05:30)`
- **Actual Prompt:**
  > `https://github.com/Swarup-Surwase/Clyro.git` — push project to repo and add a visually appealing unique README with animations (without extra useless info).
- **Task Objective:**
  1. Create self-contained animated SVG visuals (`docs/assets/clyro-hero.svg`, `docs/assets/clyro-modes.svg`, `docs/assets/clyro-pipeline.svg`) using pure CSS `@keyframes` and SMIL `<animate>` / `<animateMotion>` compatible with GitHub README rendering.
  2. Rewrite `README.md` to be concise, high-signal, and visually anchored around the animated SVGs.
  3. Add `.gitignore`, align local `main` onto `origin/main`, commit cleanly, and push to `https://github.com/Swarup-Surwase/Clyro.git`.
- **Files Changed:**
  - `.gitignore` (new)
  - `docs/assets/clyro-hero.svg` (new)
  - `docs/assets/clyro-modes.svg` (new)
  - `docs/assets/clyro-pipeline.svg` (new)
  - `README.md`
  - `PROMPT_LOG.md`
- **Verification Commands & Actual Results:**
  - Validated all three SVG documents for well-formed XML, verified `git status` excludes `node_modules/`, `dist/`, `test-results/`, and incremental build caches, committed on `main`, and pushed to `origin/main`.
- **Remaining Issues:**
  - None.
