# YojanaMitra Evaluation Report

- **Run Date:** 2026-11-18
- **Dataset:** `/data/eval/questions.json` (**120** multilingual questions across EN, HI, MR, Hinglish & Marathi-English + **25** hand-labeled eligibility profile cases)
- **Knowledge Base:** 46 verified Central & Maharashtra government schemes
- **Execution Mode:** Deterministic Degraded Mode (Local Hybrid RAG + Pure Rule Engine — no external API key set)

## Headline Metrics

| Metric | Score | Details |
| --- | --- | --- |
| **Retrieval Recall@5** | **98.3%** | 118 / 120 queries retrieved expected scheme in top 5 |
| **Citation Correctness** | **100.0%** | 120 / 120 answers had 100% valid `[Sn]` source mappings |
| **Fact Groundedness** | **99.2%** | 119 / 120 verified key facts grounded in retrieved context |
| **Eligibility Engine Accuracy** | **100.0%** | 25 / 25 exact matches on hand-labeled citizen profiles |
| **Hallucination Rate** | **0.0%** | 0 / 120 answers with invalid citation or invented ₹ amount |
| **Language-Match Rate** | **99.2%** | 119 / 120 detected & answered in the user's language |
| **Latency (p50 / p95)** | **1.5 ms / 3.4 ms** | End-to-end in-process hybrid RAG + eligibility + citation generation |

## Breakdown by Language

| Language | Questions | Recall@5 | Language-Match Rate |
| --- | --- | --- | --- |
| English (`en`) | 38 | 97.4% | 97.4% |
| Hindi & Hinglish (`hi`) | 42 | 97.6% | 100.0% |
| Marathi & Marathi-English (`mr`) | 40 | 100.0% | 100.0% |

## Breakdown by Category

| Category | Questions | Recall@5 |
| --- | --- | --- |
| farmer | 20 | 100.0% |
| woman | 20 | 100.0% |
| student | 19 | 100.0% |
| senior | 17 | 88.2% |
| worker | 16 | 100.0% |
| disabled | 13 | 100.0% |
| health | 7 | 100.0% |
| housing | 8 | 100.0% |

## Error Analysis

Retrieval misses (2):
- **SR01**: "I am a 72-year-old senior citizen. How do I get the free ₹5 lakh Ayushman Vaya Vandana health card?" — expected `ayushman-vaya-vandana`, got `senior-citizen-savings-scheme, ignoaps-old-age-pension, rashtriya-vayoshri-yojana, ayushman-bharat-pm-jay, igndps-disability-pension`
- **SR07**: "अटल पेंशन योजना में 60 साल के बाद कितनी पेंशन मिलती है और पात्रता उम्र क्या है?" — expected `atal-pension-yojana`, got `senior-citizen-savings-scheme, ignoaps-old-age-pension, rashtriya-vayoshri-yojana, ignwps-widow-pension, igndps-disability-pension`

_Zero eligibility-engine misclassifications across all 25 hand-labeled profile cases._

## Notes on Methodology
- Retrieval combines metadata pre-filtering, multilingual BM25, and dense cosine similarity merged via Reciprocal Rank Fusion (RRF), followed by deterministic eligibility reranking.
- When `GEMINI_API_KEY` is provided in `.env.local`, live Gemini generation can additionally be audited for fluency while preserving the exact same deterministic eligibility & citation guarantees.
