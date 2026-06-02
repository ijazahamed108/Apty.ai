# Deployment guide — free hosting

Mini Apty has two deployable parts:

| Part | Host on | Free option |
|------|---------|-------------|
| **API** (Express + MongoDB) | Vercel, Render, GitLab | Vercel Hobby / Render Free / GitLab CI + Render |
| **Database** | MongoDB Atlas | M0 free cluster |
| **Extension** (Chrome) | Not a web deploy | GitLab CI artifact ZIP → Load unpacked |

---

## 1. MongoDB Atlas (required for production)

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create an **M0 free cluster**.
3. Database Access → add user with read/write password.
4. Network Access → allow `0.0.0.0/0` (or Vercel/Render IP ranges).
5. Connect → copy connection string, e.g.  
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/miniapty`

**⚠️ IMPORTANT: URL-encode special characters in password**

If your password contains special characters (like `@`, `#`, `$`, etc.), you **must** URL-encode them:

| Character | Encoded | Character | Encoded |
|-----------|---------|-----------|---------|
| `@` | `%40` | `#` | `%23` |
| `$` | `%24` | `%` | `%25` |
| `&` | `%26` | `=` | `%3D` |
| `/` | `%2F` | `:` | `%3A` |

**Example:**  
- Original password: `myP@ss#123`  
- Encoded password: `myP%40ss%23123`  
- Full URI: `mongodb+srv://user:myP%40ss%23123@cluster.mongodb.net/miniapty`

---

## 2. Deploy API to Vercel (recommended)

1. Push repo to **GitHub** or **GitLab** and import in [vercel.com](https://vercel.com).
2. Framework preset: **Other**.
3. Root directory: repository root (monorepo).
4. **Critical — Vercel project settings** (Settings → Build & Deployment):
   - **Output Directory:** leave **blank** (do not set `public`)
   - **Framework Preset:** Other
   - Install/build commands are read from `vercel.json` automatically

5. The `vercel.json` file configures:
   - Install: `npm install -g pnpm@9 && pnpm install --prod=false`
   - Build: `pnpm --filter @mini-apty/shared build && pnpm --filter backend build`
   - Serverless function: `api/index.ts` (Express API, no static site)
   
   **Note:** `--prod=false` ensures devDependencies (TypeScript) are installed for build.

6. Set **Environment variables** (Production):

   | Variable | Example |
   |----------|---------|
   | `JWT_SECRET` | long random string (32+ chars) |
   | `MONGODB_URI` | Atlas connection string |
   | `MONGODB_DB` | `miniapty` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | `*` or your domain |

7. Deploy. API routes:
   - `https://YOUR_PROJECT.vercel.app/` — landing page
   - `https://YOUR_PROJECT.vercel.app/health`
   - `https://YOUR_PROJECT.vercel.app/auth/signup`
   - `https://YOUR_PROJECT.vercel.app/walkthroughs`

---

## 3. Deploy API to Render (alternative)

1. Connect repo at [render.com](https://render.com).
2. Use **Blueprint** → `render.yaml` in repo root, or create **Web Service** manually:
   - **Build:** `npm install -g pnpm@9 && pnpm install && pnpm --filter @mini-apty/shared build && pnpm --filter backend build`
   - **Start:** `node packages/backend/dist/index.js`
   - **Health check path:** `/health`
3. Add env vars from `.env.production.example`.
4. Note: free tier sleeps after inactivity (~50s cold start).

---

## 4. GitLab CI (build + Pages + artifacts)

1. Push to GitLab.
2. Pipeline runs automatically (`.gitlab-ci.yml`):
   - **test** — backend unit tests
   - **build:extension** — produces `mini-apty-extension.zip` artifact
   - **pages** — publishes static site + extension files on GitLab Pages (default branch)

3. Download extension ZIP from **CI/CD → Jobs → build:extension → Artifacts**.

4. Deploy API separately (Vercel or Render) — GitLab Pages hosts static/ extension files only.

---

## 5. Build extension for production

Set API URL **before** building (Vite bakes `VITE_*` at build time):

```bash
cp .env.production.example .env.production
# Edit VITE_API_BASE_URL=https://your-api.vercel.app

export VITE_API_BASE_URL=https://your-api.vercel.app
pnpm install
pnpm build:extension
```

Load in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `packages/extension/dist`

For CI, set `VITE_API_BASE_URL` as a GitLab CI/CD variable and pass to build job.

---

## 6. Environment variable reference

| Variable | Where | Required |
|----------|-------|----------|
| `JWT_SECRET` | Backend | Yes |
| `MONGODB_URI` | Backend | Yes |
| `MONGODB_DB` | Backend | No (default `miniapty`) |
| `CORS_ORIGIN` | Backend | No (`*` ok for extension) |
| `VITE_API_BASE_URL` | Extension build | Yes for production |

---

## 7. Local development (unchanged)

```bash
docker compose up -d          # local MongoDB
cp .env.example .env
pnpm install
pnpm dev:backend              # API :3001
pnpm dev:extension            # Vite dev for extension
pnpm build:extension          # dist for Chrome
```

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| `No entrypoint found in output directory: "public"` | Set Framework to **Other**, ensure `public/index.html` exists, `framework: null` in vercel.json |
| `No Output Directory named "public" found` | Ensure `public/` folder exists (included in repo) OR clear Output Directory in Vercel dashboard |
| `tsc: command not found` during build | Ensure install command includes `--prod=false` (already in `vercel.json`/`render.yaml`) |
| Vercel 500 on first request | Check Atlas IP allowlist and `MONGODB_URI` |
| Extension can't reach API | Rebuild with correct `VITE_API_BASE_URL` |
| CORS errors | Set `CORS_ORIGIN=*` or include extension origin |
| Render cold start | Wait ~30–60s after idle; use UptimeRobot ping on `/health` |
| GitLab Pages 404 for API | Pages is static only — API must be on Vercel/Render |
| Password with special chars fails | URL-encode password (see section 1) |

---

## Architecture after deploy

```mermaid
flowchart LR
  subgraph client [Client]
    EXT[Chrome Extension]
  end
  subgraph hosting [Free hosting]
    VERCEL[Vercel / Render API]
    ATLAS[(MongoDB Atlas M0)]
  end
  EXT -->|HTTPS REST + JWT| VERCEL
  VERCEL --> ATLAS
```
