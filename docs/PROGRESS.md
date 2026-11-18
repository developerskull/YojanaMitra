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
