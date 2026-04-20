# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY apps apps
COPY libs libs

# Generate Prisma client
RUN DATABASE_URL="file:/tmp/build.sqlite" npx prisma generate --schema=libs/db/prisma/schema.prisma

# Build API and web
RUN pnpm exec nx build api --configuration=production
RUN pnpm exec nx build web --configuration=production

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git bash curl

# Install GitHub CLI (from Alpine edge community, with architecture-aware fallback)
RUN apk add --no-cache --repository https://dl-cdn.alpinelinux.org/alpine/edge/community github-cli || \
    (ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
     curl -fsSL "https://github.com/cli/cli/releases/download/v2.45.0/gh_2.45.0_linux_${ARCH}.tar.gz" | \
     tar -xz -C /usr/local --strip-components=1)

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Copy built artifacts from builder
COPY --from=builder /app/dist/apps/api ./dist/api
COPY --from=builder /app/dist/apps/web ./dist/web
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/db/prisma ./prisma

EXPOSE 3000

COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/api/main.js"]
