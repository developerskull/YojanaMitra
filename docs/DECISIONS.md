# Architectural & Product Decisions Log

This document records key engineering, product, and data-integrity decisions made during the construction of YojanaMitra.

---

## ADR-001: Next.js App Router + Tailwind CSS v4 + Strict TypeScript
- **Context**: Needed a fast, SEO-friendly, mobile-first, horizontally scalable full-stack framework deployable on Vercel, Node hosts, or Docker without an external backend or database.
- **Decision**: Use Next.js 15 App Router with React 19, Tailwind CSS v4, Framer Motion, Radix UI primitives (`shadcn/ui` conventions), Zod, and `strict: true` + `noUncheckedIndexedAccess: true` in `tsconfig.json`.
- **Consequences**: Unified TypeScript types across API routes, scripts, and React UI; zero cold-start DB latency; `output: 'standalone'` enables a compact multi-stage Docker image.

## ADR-002: Zero-Database File Repository Behind Swappable Interfaces
- **Context**: Strict constraint prohibits Postgres, MongoDB, Supabase, Firebase, or Redis for now, while requiring easy future migration.
- **Decision**: Store each government scheme as an individual JSON file under `/data/schemes/<id>.json` and the prebuilt vector/BM25 index in `/data/embeddings/index.json`. Wrap data access, response caching, and rate limiting behind TypeScript interfaces (`SchemeRepository`, `ResponseCache`, `RateLimiter`) backed by module-level singletons.
- **Consequences**: Every serverless/container replica loads ~40–50 JSON files once into memory (<5 MB RAM), achieving sub-millisecond reads and zero network hops. Swapping to Postgres/pgvector or Redis later only requires new adapter implementations.

## ADR-003: Deterministic Eligibility Engine First, LLM Second
- **Context**: Incorrect welfare eligibility advice harms vulnerable citizens (wasted travel to CSC centers, missed deadlines, false hope).
- **Decision**: Never allow the LLM to independently compute eligibility status. A pure TypeScript rule engine (`/lib/eligibility`) evaluates age, gender, income, land holding, occupation, social category, disability, state, residence type, education, and BPL status against Zod-validated scheme rules, returning `eligible | likely | not_eligible | missing_info` plus human-readable reasons in English, Hindi, and Marathi. The LLM receives these deterministic verdicts as ground truth and explains them with `[S1]`, `[S2]` citations.
- **Consequences**: 100% auditable, unit-testable eligibility verdicts and zero hallucinated qualification rules.

## ADR-004: Dual-Mode Embeddings & Degraded No-LLM Mode
- **Context**: Users or CI environments may run `npm run setup`, `npm run dev`, or `npm run eval` before configuring a `GEMINI_API_KEY` (or when an LLM provider experiences an outage).
- **Decision**:
  1. `/scripts/build-index.ts` uses the configured Gemini (or OpenAI) multilingual embedding model when an API key is available, and falls back cleanly to a deterministic 256-dimensional multilingual character n-gram + domain-synonym hashed vector embedding when offline/unconfigured. Both modes pair with BM25 via Reciprocal Rank Fusion (RRF).
  2. `/lib/llm` implements timeout, exponential-backoff retries, secondary model fallback, and a deterministic no-LLM degraded responder that still produces localized, cited summaries and full scheme cards directly from the RAG + Eligibility engines.
- **Consequences**: The app is resilient in production and runnable out-of-the-box for reviewers without requiring immediate API billing setup, while seamlessly upgrading to full Gemini generation once `GEMINI_API_KEY` is supplied.

## ADR-005: Honesty Over Completeness for Scheme Facts
- **Context**: Government scheme parameters (interest rates, annual deadlines, state-specific budgets) change over time.
- **Decision**: Only include facts verified against official Indian government portals (`pmkisan.gov.in`, `pmjay.gov.in`, `myscheme.gov.in`, `mahadbt.maharashtra.gov.in`, `ladakibahin.maharashtra.gov.in`, `scholarships.gov.in`, etc.). Any scheme with periodically revised amounts, annual cut-off dates, or state-variable caps is explicitly flagged with `"needsVerification": true`, displays a visible verification notice, and always provides the official portal URL and helpline.
- **Consequences**: Maximizes citizen safety and transparency.

## ADR-006: Browser-Only User State & Zero-PII Server Logging
- **Context**: Citizens share sensitive socio-economic details (income, caste category, disability, age, land size).
- **Decision**: Persist user profile, saved schemes, and document checklist strictly in browser `localStorage` with a prominent one-click **"Delete my data"** control. Server logs strip raw messages and redact Aadhaar-like numbers, phone numbers, and emails.
- **Consequences**: Strong privacy guarantees with zero authentication friction for first-time smartphone users.

## ADR-007: Accessible Civic Design Palette & Devanagari Typography
- **Context**: Target audience includes first-time smartphone users on low-end Android phones reading English, Hindi, and Marathi.
- **Decision**: Load `Plus Jakarta Sans`, `Noto Sans`, and `Noto Sans Devanagari` via `next/font/google`, enforce `>= 16px` body size, `>= 48px` touch targets, WCAG 2.2 AA contrast ratios on a warm off-white (`#FBF9F5`) / deep saffron (`#D45015`) / civic teal (`#0D5C63`) palette with glassmorphic depth, true dark mode, and a high-contrast toggle, and respect `prefers-reduced-motion`.
- **Consequences**: Premium visual hierarchy paired with comfortable Devanagari legibility and effortless tap accuracy on small screens.

## ADR-008: Stateless Signed-Cookie Auth & Database-Free Admin Request Dashboard
- **Context**: Operators requested optional Citizen Login/Sign-Up and a protected Admin Login with a live dashboard to inspect all citizen scheme requests — while retaining the zero-database architectural constraint.
- **Decision**:
  1. Authenticate Citizens and Admins via `scryptSync` salted password hashes and HMAC-SHA256 signed HTTP-only cookies (`/lib/auth/session.ts`) — keeping guest access 100% open for first-time citizens.
  2. Persist accounts and PII-redacted citizen request audit records behind swappable TypeScript interfaces (`UserStore`, `RequestLogStore`) backed by memory + gitignored JSON files (`/data/runtime/`) with safe read-only serverless fallback.
  3. Restrict `/api/admin/requests` strictly to authenticated `role === 'admin'` sessions, exposing live KPIs, language & scheme analytics, filtering, and CSV export on `/admin`.
- **Consequences**: Zero external database dependencies, clean drop-in path to Postgres/Auth0 later, and full operational visibility for administrators.
