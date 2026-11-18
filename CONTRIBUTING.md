# Contributing to YojanaMitra

Thank you for helping make Indian government welfare schemes accessible, accurate, and trustworthy!

## Guiding Principles
1. **Honesty Over Completeness**: Never guess or fabricate eligibility rules, amounts, interest rates, or deadlines. Only cite official `.gov.in` / `.nic.in` portals, Press Information Bureau (PIB) releases, or official State Government Resolutions (GRs).
2. **Flag Uncertainty**: If a scheme's interest rate, subsidy cap, or application deadline changes periodically, set `"needsVerification": true` and note it clearly in the scheme summary/deadlines.
3. **Respectful, Simple Translations**: Every scheme and UI string must include natural, everyday English (`en`), Hindi (`hi`), and Marathi (`mr`) text understandable by first-time smartphone users.
4. **Preserve Stateless, DB-Free Architecture**: Do not introduce database dependencies or server-side user sessions. Keep user data in browser storage only, and never log PII.

## Adding or Updating a Scheme
1. Add or edit `/data/schemes/<kebab-case-id>.json` following `SchemeSchema` in `/lib/schemes/schema.ts`.
2. Ensure `lastVerified` is today's ISO date (`YYYY-MM-DD`) and `sourceUrls` includes at least one official URL.
3. Run the verification suite before opening a PR:
   ```bash
   npm run validate:data
   npm run build-index
   npm run typecheck
   npm run lint
   npm run test
   npm run eval
   ```
4. Include any new evaluation test cases in `/data/eval/questions.json` if adding a major scheme or new state.
