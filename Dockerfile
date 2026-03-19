FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app

ENV AUTH_MODE=google
ENV GOOGLE_INTEGRATION_MODE=google
ENV GOOGLE_CLIENT_ID=build-placeholder-client-id
ENV GOOGLE_CLIENT_SECRET=build-placeholder-client-secret
ENV GOOGLE_REDIRECT_URI=https://build-placeholder.invalid/auth/callback
ENV GOOGLE_HOSTED_DOMAIN=conceivable.life
ENV GOOGLE_IMPERSONATED_ADMIN=rbac@conceivable.life
ENV GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account"}'
ENV GOOGLE_REPORTS_FOLDER_ID=build-placeholder-folder
ENV GOOGLE_REPORTS_SHARED_DRIVE_ID=build-placeholder-drive
ENV DATABASE_URL=postgresql://build:build@localhost/build
ENV APP_BASE_URL=https://build-placeholder.invalid
ENV SESSION_SECRET=build-placeholder-session-secret
ENV ALLOWED_ADMIN_EMAILS=rodrigo@conceivable.life
ENV ADMIN_ROLE_OVERRIDES=rodrigo@conceivable.life:SUPER_ADMIN

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080

CMD ["node", "server.js"]
