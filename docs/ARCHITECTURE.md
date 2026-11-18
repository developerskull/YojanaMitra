# YojanaMitra Architecture

## Core Design Goals
1. **Zero Database, Horizontally Scalable**: All welfare scheme knowledge lives in versioned JSON files under `/data/schemes` and pre-computed hybrid search indexes under `/data/embeddings/index.json`. Every API instance loads the immutable dataset into module-level memory once and serves requests statelessly.
2. **Trust Through Determinism**: Eligibility is **never** decided solely by an LLM. A pure rule evaluator (`/lib/eligibility`) evaluates structured user attributes against Zod-validated scheme rules, returning exact matched rules, failed rules, and missing fields in English, Hindi, and Marathi. The LLM only explains verified context with `[S1]`, `[S2]` source citations.
3. **Graceful Degradation**: If an LLM provider is slow, unreachable, rate-limited, or unconfigured, YojanaMitra seamlessly falls back to a secondary model and finally to a deterministic no-LLM mode that still delivers verified scheme cards, eligibility reasons, documents, and official links.
4. **Swappable Interfaces**: Scheme repository, embedding index, response cache (LRU), rate limiter (token bucket), LLM provider, and voice STT/TTS adapters are all defined behind TypeScript interfaces so PostgreSQL/pgvector, Redis, or cloud STT/TTS can be dropped in later without rewriting application code.

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client["Browser / PWA (No Login Required)"]
        UI["Next.js App Router UI<br/>EN / HI / MR + High Contrast + Dark Mode"]
        Voice["Voice Adapter<br/>Web Speech API (STT/TTS)<br/>Fallback & Cloud-Ready Interface"]
        Local["Local State (localStorage)<br/>User Profile, Saved Schemes, Doc Checklist"]
        SW["Service Worker (PWA)<br/>Offline Shell + Cached Scheme Catalog"]
    end

    subgraph Edge["Stateless Next.js Route Handlers"]
        Guard["Security & Scale Layer<br/>IP Token-Bucket Rate Limiter<br/>Size Guard + Prompt-Injection Filter"]
        Cache["Response LRU Cache<br/>(Interface-based -> Redis ready)"]
        ChatAPI["POST /api/chat (SSE Stream)"]
        EligAPI["POST /api/eligibility"]
        SchemesAPI["GET /api/schemes (Edge Cached)"]
        HealthAPI["GET /api/health"]
    end

    subgraph Core["In-Memory Stateless Core"]
        Lang["Language Detector &<br/>Code-Mix Normalizer (EN/HI/MR)"]
        ProfileExt["Structured Profile Extractor<br/>(Deterministic NLP + JSON-Schema LLM)"]
        RAG["Hybrid Search Engine<br/>BM25 + Cosine Vector + RRF<br/>+ Metadata Pre-Filter"]
        Elig["Deterministic Eligibility Engine<br/>Pure Rule Evaluator (Zero-LLM)"]
        LLMAdapter["LLM Adapter (/lib/llm)<br/>Gemini (default) / OpenAI / Anthropic<br/>Retry + Timeout + Degraded Mode"]
    end

    subgraph Data["Versioned File Knowledge Base (No DB)"]
        Schemes["/data/schemes/*.json<br/>40+ Zod-Validated Schemes"]
        Index["/data/embeddings/index.json<br/>Chunked Vectors + BM25 + SHA-256 Hash"]
    end

    UI <--> Voice
    UI <--> Local
    UI <--> SW
    UI -->|SSE / JSON| Guard
    Guard --> Cache
    Cache --> ChatAPI
    Guard --> EligAPI
    Guard --> SchemesAPI
    Guard --> HealthAPI

    ChatAPI --> Lang --> ProfileExt
    ProfileExt --> RAG
    ProfileExt --> Elig
    RAG <--> Index
    Elig <--> Schemes
    SchemesAPI <--> Schemes
    RAG --> LLMAdapter
    Elig --> LLMAdapter
    LLMAdapter -->|Grounded Citations + Stream| ChatAPI
```

---

## Query Execution Pipeline (`/api/chat`)

```mermaid
sequenceDiagram
    participant U as Citizen (Browser)
    participant API as POST /api/chat (SSE)
    participant SEC as Guard / RateLimit / Cache
    participant RAG as Hybrid RAG + Profile Extractor
    participant ELIG as Deterministic Eligibility Engine
    participant LLM as LLM Adapter (or Degraded Mode)

    U->>API: Message + Optional Saved Profile + UI Language
    API->>SEC: Check IP Rate Limit, Size, Prompt-Injection Filter
    SEC-->>API: Allowed (or Refusal / 429)
    API->>RAG: Detect Language (EN/HI/MR/Code-Mix) & Extract Structured Profile
    API-->>U: SSE event: profile
    API->>RAG: Metadata Pre-Filter + BM25 + Vector Cosine + RRF
    RAG-->>API: Top Candidate Schemes + Cited Chunks [S1..Sn]
    API->>ELIG: Evaluate User Profile vs Candidate Scheme Rules
    ELIG-->>API: Ranked Results (eligible / likely / missing_info / not_eligible)
    API-->>U: SSE event: schemes (cards with rules, docs, steps, links)
    API-->>U: SSE event: citations ([S1], [S2] snippets + source URLs)
    API->>LLM: Stream Grounded Explanation (Strict Context-Only Prompt)
    loop Token Stream
        LLM-->>API: Token chunk
        API-->>U: SSE event: token
    end
    API-->>U: SSE event: followups + done
```

---

## Directory Layout

| Path | Responsibility |
| --- | --- |
| `/app` | Next.js App Router pages, layouts, PWA manifest, and API route handlers |
| `/components` | Accessible UI primitives (`shadcn/ui`-style), chat interface, scheme cards, wizard, explorer |
| `/lib/schemes` | Zod schemas, TypeScript types, and singleton scheme repository interface |
| `/lib/llm` | Provider-agnostic LLM & embedding adapter (Gemini, OpenAI, Anthropic, degraded mode) |
| `/lib/rag` | Chunking, BM25, cosine vector search, RRF, profile extraction, prompt builder |
| `/lib/eligibility` | Pure deterministic rule engine + localized rule explanation generator |
| `/lib/i18n` | EN/HI/MR translations, language detector, code-mix normalizer |
| `/lib/voice` | Web Speech API STT/TTS implementation behind a pluggable cloud-ready adapter |
| `/lib/ratelimit` | Interface-based per-IP token bucket rate limiter |
| `/lib/cache` | Interface-based in-memory LRU cache |
| `/lib/security` | Prompt injection filter, input sanitizer, off-topic/harm guard |
| `/lib/logging` | PII-redacting structured JSON logger |
| `/data/schemes` | One versioned JSON file per Indian government scheme |
| `/data/embeddings` | Build-time generated hybrid index (`index.json`) with content hash |
| `/data/eval` | 100+ multilingual evaluation questions and labeled profiles |
| `/scripts` | `validate-data.ts`, `build-index.ts`, `run-eval.ts` |
| `/tests` | Vitest unit tests (`/tests/unit`) and Playwright E2E tests (`/tests/e2e`) |
| `/docs` | Architecture, architectural decisions, progress log, and evaluation report |
