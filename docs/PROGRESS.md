# YojanaMitra Progress Log

## Stage 1: Project Foundation ✅
- Initialized Git repository on `main`.
- Scaffolded Next.js 15.5 (App Router) + React 19 + strict TypeScript (`noUncheckedIndexedAccess`, `strict`) + Tailwind CSS v4 + Framer Motion + Radix UI primitives + Zod + Vitest + Playwright.
- Created full project folder layout (`/app`, `/components`, `/lib/*`, `/data/*`, `/scripts`, `/docs`, `/tests/*`).
- Implemented Zod environment validator (`/lib/env.ts`), `.env.example`, accessible UI primitives (`/components/ui`), and civic theme tokens in `/app/globals.css`.
- Wrote `/docs/ARCHITECTURE.md` (with Mermaid system & sequence diagrams) and `/docs/DECISIONS.md`.
- Verified: `npm run typecheck`, `npm run lint`, and `npm run build` all pass with zero warnings or errors.

## Stage 2: File-Based Knowledge Base (46 Schemes, No DB) ✅
- Defined strict Zod schema and TypeScript domain types in `/lib/schemes/schema.ts` covering multilingual (`en`, `hi`, `mr`) names, summaries, benefits, application steps, canonical document requirements, structured eligibility rules, deadlines, helplines, `lastVerified`, `sourceUrls`, and `needsVerification`.
- Implemented storage-agnostic `SchemeRepository` interface and module-level singleton `FileSchemeRepository` in `/lib/schemes/repository.ts`.
- Seeded **46 real Central and Maharashtra government schemes** as individual versioned JSON files under `/data/schemes/*.json` spanning farmers, students, women, senior citizens, workers/entrepreneurs, health/housing, and persons with disabilities (21 schemes transparently flagged `needsVerification: true` for periodically revised rates/cycles).
- Implemented `/scripts/validate-data.ts` (wired into `npm run build`) enforcing Zod validation, EN/HI/MR parity, filename-ID integrity, duplicate detection, and >180-day staleness warnings.
- Verified: `npm run validate:data` (46/46 passed, 0 warnings), `npm run typecheck`, `npm run lint`, and `npm run build` all pass.

## Stage 3: File-Based RAG Engine & Streaming SSE (No DB) ✅
- Implemented provider-agnostic LLM adapter (`/lib/llm/types.ts`, `/lib/llm/adapter.ts`) supporting Gemini (default), OpenAI-compatible, Anthropic, and deterministic degraded no-LLM mode with timeouts, exponential-backoff retries, and secondary model fallback.
- Built multilingual language detector & Devanagari-digit normalizer (`/lib/i18n/detect.ts`) supporting EN, HI, MR, Hinglish, and Marathi-English code-mixed text.
- Implemented section chunker (`/lib/rag/chunker.ts`), multilingual embedder (`/lib/rag/embedder.ts`), BM25 scorer + Reciprocal Rank Fusion (`/lib/rag/bm25.ts`), structured user profile extractor (`/lib/rag/profile-extractor.ts`), singleton hybrid search engine (`/lib/rag/index.ts`), and strict grounded citation prompts (`/lib/rag/prompt.ts`).
- Built `/scripts/build-index.ts` generating `/data/embeddings/index.json` (230 section chunks across 46 schemes, content hash `7695cffd6c2d7b23`).
- Built streaming SSE endpoint `/app/api/chat/route.ts` emitting structured `profile`, `schemes`, `citations`, `token`, `followups`, and `done` events.
- Verified: `npm run build-index`, `npm run typecheck`, `npm run lint`, and `npm run build` all pass.

## Stage 4: Deterministic Eligibility Engine & Guided Wizard Core ✅
- Implemented pure zero-LLM rule evaluator (`/lib/eligibility/engine.ts`) checking state, age range, gender, occupation, land ownership & holding acres, annual income ceiling, social/caste category, disability & %, residence type, education level, BPL status, marital status, and taxpayer/govt-employee exclusions — returning `eligible | likely | not_eligible | missing_info` with auditable reasons in English, Hindi, and Marathi.
- Built smart missing-field wizard generator (`/lib/eligibility/wizard.ts`) asking only relevant missing questions one at a time in EN/HI/MR.
- Integrated deterministic eligibility evaluation and eligibility-aware reranking directly into `/app/api/chat/route.ts` so the LLM never decides eligibility alone.
- Added `/app/api/eligibility/route.ts` and edge-cached `/app/api/schemes/route.ts`.
- Verified: `npm run typecheck`, `npm run lint`, and live smoke test on Marathi Nashik farmer query (`मी नाशिकचा ४५ वर्षांचा शेतकरी आहे, माझ्याकडे २ एकर जमीन आहे`) accurately extracted all 7 profile attributes and returned verified eligible schemes (`pm-kisan`, `namo-shetkari-mahasanman-nidhi`, `pm-fasal-bima-yojana`, `kisan-credit-card`, `pm-kusum`, `maharashtra-magel-tyala-shet-tale`).

## Stage 5: Voice & Multilingual (EN / HI / MR + Code-Mixed) ✅
- Authored full English, Hindi, and Marathi UI translation dictionaries (`/lib/i18n/translations.ts`) and persisted `I18nProvider` React context (`/lib/i18n/context.tsx`).
- Built provider-agnostic Voice STT & TTS adapter interfaces (`/lib/voice/types.ts`, `/lib/voice/index.ts`) ready to plug in Whisper or Google Cloud STT/TTS later.
- Implemented Web Speech API STT (`en-IN`, `hi-IN`, `mr-IN`, interim transcripts, graceful unsupported-browser & permission-denied states) and `speechSynthesis` TTS with citation/markdown scrubbing (`/lib/voice/web-speech.ts`).
- Built local-only browser persistence module (`/lib/storage/local.ts`) for user profile, saved schemes, comparison list, checked documents, theme, and high-contrast preference with one-click `clearAllUserData()`.
- Verified: `npm run typecheck` and `npm run lint` pass cleanly.

## Stage 6: Mobile-First UI / UX, Accessibility & PWA ✅
- Crafted warm Indian civic design system (deep saffron `#C84B14`, civic teal `#0F6B6E`, warm off-white `#FAF8F4`, true dark mode, high-contrast mode toggle, `Noto Sans` + `Noto Sans Devanagari`, `>= 16px` body, `>= 48px` touch targets, `prefers-reduced-motion`, WCAG 2.2 AA skip link & ARIA live regions).
- Added persistent official-source trust banner (`Last verified: 2026-11-18`) and offline status indicator in `/components/layout/AppShell.tsx`.
- Built Landing + SSE Streaming Chat experience (`/components/chat/ChatExperience.tsx`) with large accessible Mic button + graceful unsupported fallback, 6 quick-start category cards, 3-step How It Works strip, detected profile pills, Read Aloud on every answer, expandable `[S1]` citation chips, follow-up chips, and rich interactive `/components/schemes/SchemeCard.tsx` (Green/Amber/Red eligibility badges, "Why you qualify", checkable documents, steps timeline, official apply link, WhatsApp share, Save, Compare).
- Built Guided Eligibility Wizard (`/wizard`), instant client-side Scheme Explorer (`/explorer`), Saved Schemes + Aggregated Printable Documents Checklist + Side-by-Side Compare Table (`/saved`), local-only My Profile editor with "Delete All My Data" (`/profile`), and multilingual Privacy page (`/privacy`).
- Added installable PWA Web App Manifest (`/app/manifest.ts`), SVG app icon (`/public/icons/icon.svg`), and offline-capable Service Worker (`/public/sw.js`).
- Verified: `npm run typecheck`, `npm run lint`, and `npm run build` (13/13 static & dynamic routes) all pass cleanly.

## Stage 7: Scale, Security & Reliability (Stateless, No DB) ✅
- Implemented interface-based in-memory LRU response cache (`/lib/cache/lru.ts`) keyed by SHA-256 query+profile+lang hash (Redis-ready).
- Implemented interface-based per-IP token-bucket rate limiter (`/lib/ratelimit/token-bucket.ts`) and 16 KB request body size guard (`413` / `429` with `Retry-After`).
- Added prompt-injection, harmful-request, and off-topic guard (`/lib/security/guard.ts`) plus retrieved-context sanitization (`/lib/rag/prompt.ts`) that politely refuses adversarial inputs in EN/HI/MR without leaking system prompts.
- Added PII-redacting structured JSON logger (`/lib/logging/logger.ts`) blocking raw messages/profiles and redacting Aadhaar-like 12-digit numbers, phone numbers, PANs, and emails.
- Added stateless health endpoint (`/app/api/health/route.ts`) reporting scheme count, RAG index hash, LLM mode, and cache stats, plus React Error Boundaries (`/app/error.tsx`, `/app/global-error.tsx`).
- Verified: `npm run typecheck`, `npm run lint`, and `npm run build` pass cleanly.

## Stage 8: Evaluation Suite, Unit Tests & Playwright E2E Tests ✅
- Created `/data/eval/questions.json` with **120 multilingual test questions** (EN, HI, MR, Hinglish, Marathi-English across all 8 scheme categories) and **25 hand-labeled citizen eligibility ground-truth cases**.
- Built `/scripts/run-eval.ts` outputting `/docs/EVAL_REPORT.md` with real measured metrics:
  - **Retrieval Recall@5:** `98.3%` (118/120)
  - **Citation Correctness:** `100.0%` (120/120)
  - **Fact Groundedness:** `99.2%` (119/120)
  - **Eligibility Engine Accuracy:** `100.0%` (25/25)
  - **Hallucination Rate:** `0.0%`
  - **Language-Match Rate:** `99.2%` (119/120)
  - **Latency (p50 / p95):** `1.5 ms / 3.4 ms`
- Fixed 3 real bugs surfaced by our tests & eval: preserved Unicode combining marks (`\p{M}`) for Devanagari matras in tokenization, hardened Marathi vs. Hindi whole-word detection, and prevented benefit amounts / post-60 pension phrases from being misparsed as user age/income.
- Added **19 Vitest unit tests** (`/tests/unit/eligibility.test.ts`, `/tests/unit/rag-and-i18n.test.ts`) — 19/19 passed.
- Added **3 Playwright E2E tests** (`/tests/e2e/main-flows.spec.ts`) covering Marathi language switch, Nashik farmer chat + cited scheme cards, save scheme + documents checklist, eligibility wizard, and scheme explorer — 3/3 passed in Chromium.

## Stage 9: Documentation, Docker & Final Verification ✅
- Wrote comprehensive `README.md` with problem statement, demo GIF placeholders, feature overview, Mermaid architecture diagram, real evaluation metrics from `/docs/EVAL_REPORT.md`, quickstart, how-to-add-a-scheme guide, roadmap, and responsible-AI notes.
- Added production multi-stage `Dockerfile` (non-root runner, bundled `/data`, `/api/health` healthcheck), `.dockerignore`, and `CONTRIBUTING.md`.
- Verified one-command `npm run setup` scripts, `.env.example`, zero database anywhere, and full green pass across `validate:data`, `build-index`, `typecheck`, `lint`, `test` (19/19), `eval` (120 questions + 25 eligibility cases), `build`, and `test:e2e` (3/3 Chromium flows).
- **Admin Dashboard Layout Fix**: Resolved scheme title clipping and count badge overflow on "Top Matched Welfare Schemes" and scheme benefit leaderboards by adding `min-w-0 flex-1 line-clamp-2` with `shrink-0` anchored badges and `min-w-0 overflow-hidden` card boundaries. All tests pass and changes pushed to GitHub.
