# Logo Motion

Turn any SVG logo into a vector-construction motion graphic.

## Run it locally

You need Node.js 18+ installed ([nodejs.org](https://nodejs.org)).

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

```bash
npm run build     # production build into dist/
npm run preview   # preview that build locally
```

## Deploy

### Option A — Vercel (recommended)

1. Push this folder to a new GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Vercel auto-detects Vite. Framework: **Vite**, build: `npm run build`, output: `dist`. Deploy.

### Option B — Netlify

Same flow at [netlify.com](https://netlify.com). Build command `npm run build`, publish directory `dist`.

### Option C — no Git

```bash
npm i -g vercel
npm run build
vercel deploy --prod
```

## Custom domain

1. Buy a domain — Namecheap, Cloudflare Registrar (cheapest, at-cost), or GoDaddy.
2. In Vercel: **Project → Settings → Domains → Add**, enter your domain.
3. Vercel shows the DNS records to create. In your registrar's DNS panel add:
   - Root domain (`example.com`) → **A** record → `76.76.21.21`
   - `www` → **CNAME** → `cname.vercel-dns.com`
   
   (Use whatever values Vercel displays — they're authoritative over this README.)
4. Wait for DNS to propagate (minutes to a few hours). HTTPS is issued automatically.

If your registrar is Cloudflare, set the records to **DNS only** (grey cloud) during setup, or certificate issuing can fail.

## Notes

- MP4 export and beat-synced music are not implemented. Both need a real video
  encoder. Running locally, the usual path is `@ffmpeg/ffmpeg` (WASM, in-browser)
  or a small server endpoint that rasterises frames and pipes them to ffmpeg.
- Everything else — SVG parsing, the construction animation, templates, camera
  spots, overlays, colour and background controls, SVG export — runs fully in
  the browser with no backend.
