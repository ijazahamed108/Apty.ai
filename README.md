# Mini Apty

**MERN stack** (MongoDB, Express, React, Node.js) Chrome extension + REST API — TypeScript strict.

| Component | Package | Deploy target |
|-----------|---------|---------------|
| API | `packages/backend` | [Vercel](DEPLOYMENT.md#2-deploy-api-to-vercel-recommended) · [Render](DEPLOYMENT.md#3-deploy-api-to-render-alternative) |
| Database | MongoDB Atlas M0 | Free cloud cluster |
| Extension | `packages/extension` | GitLab CI artifact → Chrome Load unpacked |
| Shared types | `packages/shared` | Built as dependency |

**Full deploy guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Quick start (local)

```bash
docker compose up -d
cp .env.example .env
pnpm install
pnpm dev:backend
pnpm dev:extension    # or: pnpm build:extension
```

Load `packages/extension/dist` in `chrome://extensions`.

---

## Production build

```bash
# 1. Deploy API (set env vars on Vercel/Render — see DEPLOYMENT.md)
# 2. Build extension against live API
VITE_API_BASE_URL=https://your-api.vercel.app pnpm build:extension
```

---

## Commands (matches take-home PDF)

```bash
pnpm install
docker compose up -d
pnpm --filter backend dev
pnpm --filter extension build   # → packages/extension/dist
pnpm test:backend
```

---

## Stack

- **MongoDB** — walkthroughs + users (Atlas in prod, Docker locally)
- **Express** — JWT auth, owner-scoped CRUD, Zod validation
- **React** — MV3 popup + Shadow DOM preview overlay
- **Zustand + Zod** — extension state and shared schemas
- **Element targeting** — stable attrs → anchor path → XPath → fingerprint + MutationObserver

See [DEPLOYMENT.md](./DEPLOYMENT.md) for GitLab CI, Vercel, and Render setup.
