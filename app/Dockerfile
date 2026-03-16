FROM --platform=linux/amd64 oven/bun:1-alpine AS base
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY src/ ./src/

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["bun", "run", "src/server.js"]
