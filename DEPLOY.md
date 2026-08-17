# Deploying the backend

## Why not Vercel

This API is a **long-running server**, not a set of serverless functions:

- `server.ts` calls `httpServer.listen(...)` and keeps the process alive.
- Socket.IO holds WebSocket connections open to push live notifications.
- Resume uploads write files to disk.

Vercel tears a function down after each request, so `listen()` crashes it outright
(`FUNCTION_INVOCATION_FAILED`), WebSockets can't stay open, and its filesystem is read-only
apart from an ephemeral `/tmp`. Deploy the **frontend** to Vercel and the **backend** to a
platform that runs a persistent Node process — Render, Railway, Fly.io or Koyeb.

`render.yaml` in this folder is a ready-to-use Render Blueprint.

---

## Deploy to Render

> **This backend is its own repo** (`DPA-admin-backend`), so the repo root *is* this folder.
> Leave Render's **Root Directory blank**. Only set it if you later merge everything into a
> single monorepo.

### Service settings (if you created the service manually)

| Setting | Value |
|---|---|
| Root Directory | *(blank)* |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

The build command **must** include `npm run build`. With only `npm install`, TypeScript never
compiles, no `dist/` is produced, and the service dies with
`Cannot find module '/opt/render/project/src/dist/server.js'`. A build that really ran shows
this in the log:

```
> institute-management-backend@1.0.0 build
> tsc -p tsconfig.build.json
```

If those two lines are missing, the compile step didn't run.

### Or deploy from the blueprint

1. Push this repo to GitHub.
2. Render → **New +** → **Blueprint** → select the repo. It reads `render.yaml`.
3. Fill in the variables marked `sync: false` (Render generates the JWT/cookie secrets itself):

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | Your Atlas connection string |
   | `FRONTEND_URL` | `https://your-admin.vercel.app` — exact origin, **no trailing slash** |
   | `PUBLIC_WEBSITE_URL` | Public institute site, if it posts enquiries. Comma-separated for several. |
   | `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` | First owner login. Change the password after signing in. |

4. Deploy, then confirm `https://<your-service>.onrender.com/health` returns
   `{"success":true,...}`.
5. Seed the database once, from Render → **Shell**:
   ```bash
   npm run seed
   ```
6. Point the frontend at the API. In Vercel → Settings → Environment Variables set **both**:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://<your-service>.onrender.com/api/v1
   NEXT_PUBLIC_SOCKET_URL=https://<your-service>.onrender.com
   ```
   Note the first includes `/api/v1` and the second does not. These are baked in at build
   time, so you must **redeploy** the frontend after changing them.

### MongoDB Atlas must allow Render

Render's outbound IPs are dynamic on the free plan, so Atlas → **Network Access** needs
`0.0.0.0/0` (allow from anywhere). Your database is still protected by its username and
password. To restrict by IP you need a Render paid plan, which provides static outbound IPs.

---

## Two things to know about the free plan

**1. The service sleeps.** After ~15 minutes with no traffic Render spins the instance down;
the next request takes ~50 seconds while it wakes. Fine for demos, poor for real users — the
$7/month Starter plan stays warm.

**2. Uploaded resumes do not survive a redeploy.** The container filesystem is wiped on every
deploy and restart. `STORAGE_PROVIDER=local` therefore loses resumes. Options:

- **Persistent disk** (paid plans): add to `render.yaml`, mounted where `STORAGE_LOCAL_DIR` points —
  ```yaml
  disk:
    name: uploads
    mountPath: /var/data
    sizeGB: 1
  ```
- **Object storage** (works on free): implement the S3/Cloudinary branch in
  `src/utils/storage.ts` — the `StorageProvider` interface is already there for this — and set
  `STORAGE_PROVIDER` plus the `STORAGE_*` credentials.
- **Accept the loss** while evaluating. Everything else (students, fees, enquiries, placements)
  lives in MongoDB and is unaffected.

---

## Deploy checklist

- [ ] `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` set — **never** ship the
      `dev_*` fallbacks in `env.ts`; they're public knowledge and would let anyone forge an
      admin token.
- [ ] `FRONTEND_URL` matches the deployed frontend origin exactly, or the browser blocks every
      request on CORS.
- [ ] Frontend has `NEXT_PUBLIC_API_BASE_URL` **and** `NEXT_PUBLIC_SOCKET_URL`, and was
      redeployed after setting them.
- [ ] Atlas Network Access allows Render.
- [ ] `npm run seed` run once.
- [ ] Owner password changed after first login.
- [ ] `/health` returns 200.
