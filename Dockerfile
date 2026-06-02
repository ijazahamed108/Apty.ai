# Multi-stage build for GitLab Container Registry or any Docker host
FROM node:20-bookworm AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @mini-apty/shared build && pnpm --filter backend build

FROM node:20-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/backend/package.json ./packages/backend/
COPY --from=build /app/packages/backend/dist ./packages/backend/dist/
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
EXPOSE 3001
ENV PORT=3001
CMD ["node", "packages/backend/dist/index.js"]
