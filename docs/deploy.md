# Deploying

The API is a **long-lived server** (it runs the asynchronous batch and serves
generated images), so it goes on a host that keeps a process alive — Railway or
Render. The web app is a static build and goes on Vercel. Serverless would cap the
batch's execution time, which is why the API isn't on Vercel (see
[ADR 0003](architecture/adr/0003-hono-over-nextjs.md)).

## API — Railway or Render

1. New service from this repo. Build: `pnpm install && pnpm --filter @app/server build`
   (tsup bundles the shared `@app/contracts` package in). Start: `node server/dist/main.js`.
2. Set environment variables:
   - `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`
   - `PORT` — provided by the platform
   - `PUBLIC_BASE_URL` — the service's public URL (e.g. `https://<app>.up.railway.app`)
   - `WEB_ORIGIN` — the deployed web origin (e.g. `https://<app>.vercel.app`) to scope CORS
3. Generated images are written to the local `.output` dir and served from
   `${PUBLIC_BASE_URL}/images`. For durable storage across restarts, swap
   `localImageStore` for an object-store adapter (the `ImageStore` port makes this
   a one-file change).

## Web — Vercel

1. Import the repo; set the project root to `web/`.
2. Build: `pnpm install && pnpm --filter @app/web build`. Output dir: `web/dist`.
3. Set `VITE_API_URL` to the deployed API URL.

## Smoke test

```bash
curl -F products=@web/src/assets/imgs/product-lamp.jpg \
     -F refs=@web/src/assets/imgs/context-forest.jpg https://<api>/batch
# → { "jobId": "..." }
curl https://<api>/batch/<jobId>
# → { status, succeeded[], failed[] }
```

Then open the web app, upload a product + reference image, and generate. Flip
**Chaos mode** to confirm failover from the primary to the secondary image
provider end to end.
