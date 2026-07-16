FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Dev stage: full toolchain + Vite dev server with hot reload. Source is
# bind-mounted at runtime by docker-compose.dev.yml (node_modules stays baked in).
FROM deps AS dev
WORKDIR /app
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["sh", "-c", "bun run db:migrate && bun run dev --host 0.0.0.0 --port 3000"]

FROM deps AS build
COPY . .
RUN bun run build

FROM oven/bun:1.3-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src/lib/server/db ./src/lib/server/db

EXPOSE 3000
CMD ["sh", "-c", "bun run db:migrate && bun ./build/index.js"]
