# Gold & Silver ETF Tracker

Track whether Indian gold & silver ETFs are trading at a **premium or discount** to their real value (iNAV / NAV), compare the true cost of owning metal via an **ETF vs physically**, track **Sovereign Gold Bonds** across all 67 tranches, and see a live **MCX gold/silver reference** — all in one clean, fast, free-to-run site.

**Live:** https://etftrackerhyperagent.vercel.app

---

## What's in it (current state, Sep 2026)

| Surface | Route | What it does |
|---|---|---|
| **Dashboard** | `/` | All 29 gold + silver ETFs with live price, iNAV, EOD NAV, premium/discount (with staleness suppression), bid/ask spread, and source timestamps. MCX gold/silver reference strip on top. |
| **ETF detail** | `/etf/[isin]` | Per-ETF: price vs iNAV vs NAV separated, stale-data warnings, bid/ask spread, tracking error + tracking difference with plain tooltips, unit convention. |
| **SGB tracker** | `/sgb` | All 67 Sovereign Gold Bond tranches from inception (Nov 2015 – Feb 2024): trading section (45) with issue price, live price, premium-to-gold, YTM (pre/post-tax), next coupon date, maturity countdown, premature-window badge; matured/redeemed section (22) with redemption outcomes. |
| **SGB detail** | `/sgb/[isin]` | Per-tranche cash-flow calendar (every remaining coupon date), YTM pre/post-tax, premature-redemption eligibility, tax notes. |
| **ETF vs Physical** | `/calculator` | In-browser cost calculator (nothing stored): ETF vs physical with sourced GST/STT/tax model, net proceeds and round-trip cost per route. |

---

## Data sources & flows (all server-side, authorized)

| Field | Source | Notes |
|---|---|---|
| ETF/SGB live price, OHLC, bid/ask depth | **Upstox Market Quote V3** | Free token, batched (up to 500 keys/call), exchange-scoped keys (`NSE_EQ`/`BSE_EQ`). Rate limits far above need. |
| ETF iNAV | **NSE** ETF endpoint | Per-ETF `nav` + `inav` fields, browser-session fetch. |
| ETF NAV (EOD), tracking error, tracking difference | **AMFI** | Official; daily NAV + TE, monthly TD. |
| MCX gold/silver reference | **Upstox (MCX.json.gz dump + Market Quote V3)** | Nearest-month GOLD/SILVER futures, auto-rolled on expiry. |
| Metal ₹/gram reference (for premium math) | **GOLDBEES / SILVERBEES NAV** (AMFI-derived) | IBJA-based domestic price the ETFs are valued on. |
| SGB static registry | Seeded module (`convex/seed/sgbRegistry.ts`) | 67 tranches from Wikipedia SGB table + Upstox NSE dump. |

**Physical city retail prices** are intentionally NOT scraped (GoodReturns/IBJA/allindiabullion are personal-use-only or license-required). Parked for a future licensed feed.

---

## Architecture (free-cost boundary)

- **Next.js 15** (App Router, TypeScript, Tailwind v4) on **Vercel** — frontend only.
- **Convex** (free tier) = reactive database **and** cron scheduler. The Vercel build runs `npx convex deploy` first (via `CONVEX_DEPLOY_KEY`) and injects `NEXT_PUBLIC_CONVEX_URL` automatically.
- **Upstox token** lives only as a Convex env var (never in the browser).
- No login, no user-data storage.

### Scheduled jobs (Convex crons)

| Job | Schedule | Purpose |
|---|---|---|
| `poll_quotes_inav` | every 5 min (market hours) | Upstox quotes + NSE iNAV |
| `poll_mcx_refs` | every 5 min (market hours) | MCX gold/silver reference |
| `amfi_nav_daily` | daily ~20:30 IST | AMFI EOD NAV |
| `amfi_te_daily` | daily ~21:00 IST | tracking error |
| `amfi_td_monthly` | 1st of month | tracking difference |
| `discover_etfs_daily` | daily ~09:00 IST | full-lifecycle auto-discovery |

---

## Automation (add / rename / delist — no manual steps)

The daily `discover:discoverEtfs` cron reconciles the universe automatically:
- **Added** — a new gold/silver ETF (AMFI) or SGB (NSE dump) is detected, its exchange + symbol resolved from the Upstox instrument dump, grams-per-unit estimated from NAV (snapped to known conventions), and inserted **active** so it shows data immediately.
- **Renamed** — same ISIN, changed name/AMC updated in place (verified unit factor preserved).
- **Delisted** — present in DB but gone from source → marked `inactive` and dropped from the dashboard (history kept).

Quote ingestion reads instrument keys **from the DB**, so newly discovered instruments are picked up on the next poll.

---

## Data integrity rules

- Source-effective time (`sourceTs` / `navDate`) stored separately from retrieval time (`fetchedAt`).
- Missing, zero and stale are distinct; **nothing is interpolated or invented**. Zero/negative iNAV/NAV is treated as missing.
- Premium vs iNAV shows **only** intraday with same-day fresh quote + iNAV and a last trade within ~15 min; otherwise the cell shows the value's own "as of" time and no percentage.
- Upserts on natural keys — re-fetching never duplicates.

---

## Setup & deploy

```bash
npm install
npx convex dev          # creates the Convex project, writes NEXT_PUBLIC_CONVEX_URL
npx convex env set UPSTOX_ACCESS_TOKEN <your-token>
npm run dev
```

**Seeds (run once each in the Convex dashboard → Functions):**
- `functions:seedUniverse` — loads the 29 ETFs
- `sgb:seedSgbRegistry` — loads the 67 SGB tranches (also registers trading SGBs for pricing)

**Vercel:** import the repo → set `CONVEX_DEPLOY_KEY` (and optionally `NEXT_PUBLIC_CONVEX_URL`) → deploy. The build command (`vercel.json`) runs `npx convex deploy` then `next build`.

---

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Vercel (auto-injected at build) | Convex deployment URL for the frontend |
| `CONVEX_DEPLOY_KEY` | Vercel | Lets the build deploy the Convex backend |
| `UPSTOX_ACCESS_TOKEN` | **Convex env** (server-side only) | Upstox Market Quote API token — never exposed to the browser |

---

## Design

Clean, minimal, fast. Inter + JetBrains Mono, light and dark modes, sticky header, gradient MCX reference cards, premium cells as tinted directional badges (▲ amber premium / ▼ blue discount / ● green near par). Indian conventions throughout: ₹, lakhs/crores, IST.

## Out of scope (v1)

Physical city retail prices (no free authorized feed), historical premium charts, Telegram alerts, broker/execution integration, buy/sell recommendations, login.
