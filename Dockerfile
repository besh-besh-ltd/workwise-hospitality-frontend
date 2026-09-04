FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time args — Next.js bakes NEXT_PUBLIC_* into the JS bundle during build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SERVICEWORKER_PUBLIC_KEY
ARG NEXT_PUBLIC_RAZORPAY_KEY
ARG NEXT_PUBLIC_RAZORPAY_SECRET
ARG NEXT_PUBLIC_RAZORPAY_SIGNATURE
ARG NEXT_PUBLIC_AI_SERVER_URL
ARG NEXT_PUBLIC_OTEL_COLLECTOR_URL
ARG NEXT_PUBLIC_ENV
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
# Demo-only, and DEFAULTED here on purpose. The deploy workflow passes a fixed
# allowlist of --build-arg flags; anything outside it arrives empty. Without
# this the mock adapter never attaches, every screen calls a real API that does
# not serve this demo, and the whole portal renders empty.
ARG NEXT_PUBLIC_DEMO_MODE=1

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SERVICEWORKER_PUBLIC_KEY=$NEXT_PUBLIC_SERVICEWORKER_PUBLIC_KEY
ENV NEXT_PUBLIC_RAZORPAY_KEY=$NEXT_PUBLIC_RAZORPAY_KEY
ENV NEXT_PUBLIC_RAZORPAY_SECRET=$NEXT_PUBLIC_RAZORPAY_SECRET
ENV NEXT_PUBLIC_RAZORPAY_SIGNATURE=$NEXT_PUBLIC_RAZORPAY_SIGNATURE
ENV NEXT_PUBLIC_AI_SERVER_URL=$NEXT_PUBLIC_AI_SERVER_URL
ENV NEXT_PUBLIC_OTEL_COLLECTOR_URL=$NEXT_PUBLIC_OTEL_COLLECTOR_URL
ENV NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE

RUN npx next build

FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Signs the demo session cookie. lib/session.js refuses to issue a session
# without it, so sign-in 500s if nothing supplies one — and the QA deploy
# script sets only the vars the real app needs, which does not include this.
# Baked in deliberately: this session carries a persona id and nothing else,
# there is no real account or data behind it, and a broken login is worse.
# Override at `docker run -e SESSION_SECRET=...` to rotate.
ENV SESSION_SECRET=ihg-demo-session-key-2026-rotate-me

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=deps --chown=nextjs:nextjs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
