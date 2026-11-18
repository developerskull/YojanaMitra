# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

# 1. Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 2. Validate data, build RAG index & production standalone bundle
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run validate:data && npm run build-index && npm run build

# 3. Minimal stateless production runner
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Bundle immutable file-based knowledge base & precomputed hybrid index
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
