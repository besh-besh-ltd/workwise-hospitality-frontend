FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:18-alpine AS builder
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

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SERVICEWORKER_PUBLIC_KEY=$NEXT_PUBLIC_SERVICEWORKER_PUBLIC_KEY
ENV NEXT_PUBLIC_RAZORPAY_KEY=$NEXT_PUBLIC_RAZORPAY_KEY
ENV NEXT_PUBLIC_RAZORPAY_SECRET=$NEXT_PUBLIC_RAZORPAY_SECRET
ENV NEXT_PUBLIC_RAZORPAY_SIGNATURE=$NEXT_PUBLIC_RAZORPAY_SIGNATURE
ENV NEXT_PUBLIC_AI_SERVER_URL=$NEXT_PUBLIC_AI_SERVER_URL

RUN npx next build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
