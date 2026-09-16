"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

// Reference ₹/gram for estimating grams-per-unit on newly discovered funds. Self-correcting:
// the estimate only affects the ₹/gram display normalization, never a stored price.
const REF_INR_PER_GRAM = { gold: 10900, silver: 130 } as const;

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function loadInstrumentDump(exchange: "NSE" | "BSE") {
  const map = new Map<string, { symbol: string; type: string }>();
  try {
    const res = await fetch(`https://assets.upstox.com/market-quote/instruments/exchange/${exchange}.json.gz`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return map;
    const buf = await res.arrayBuffer();
    const { gunzipSync } = await import("zlib");
    const arr = JSON.parse(gunzipSync(Buffer.from(buf)).toString("utf-8"));
    for (const i of arr) {
      if (i?.isin && i?.trading_symbol) map.set(i.isin, { symbol: i.trading_symbol, type: i.instrument_type ?? "" });
    }
  } catch { /* best-effort */ }
  return map;
}

/**
 * Full-lifecycle auto-discovery — fully automatic, runs daily.
 * Universes covered:
 *  - Gold/silver ETFs from AMFI (NSE or BSE-only).
 *  - Sovereign Gold Bonds (instrument_type 'GB') from the NSE instrument dump.
 * Lifecycle per ISIN:
 *  - ADDED:    resolve exchange + symbol, estimate grams-per-unit, insert ACTIVE.
 *  - RENAMED:  same ISIN, changed name → update in place (verified unit factor preserved).
 *  - DELISTED: in DB but no longer in source → status 'inactive' (history kept).
 */
export const discoverEtfs = internalAction({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    try {
      const nse = await loadInstrumentDump("NSE");
      const bse = await loadInstrumentDump("BSE");
      const found = new Map<string, any>();

      // ---- 1. Gold & silver ETFs from AMFI ----
      const etfUrls: Array<{ metal: "gold" | "silver"; url: string; silver?: boolean }> = [
        { metal: "gold", url: "https://www.amfiindia.com/api/latest-nav?type=&mfid=all&category=Other%20Scheme%20-%20Gold%20ETF" },
        { metal: "silver", url: "https://www.amfiindia.com/api/latest-nav?type=&mfid=all&category=Other%20Scheme%20-%20Other%20%20ETFs", silver: true },
      ];
      for (const u of etfUrls) {
        const json = await fetchJson(u.url);
        for (const c of json?.data ?? []) {
          for (const cat of c?.categories ?? []) {
            for (const g of cat?.groups ?? []) {
              for (const s of g?.schemes ?? []) {
                if (u.silver && !/silver/i.test(s?.schemeName ?? "")) continue;
                if (!s?.ISINPrimary || !s?.schemeName) continue;
                const isin = s.ISINPrimary;
                const nav = parseFloat(s.netAssetValue) || 0;
                // exchange resolution: prefer NSE, fall back to BSE for BSE-only
                const onNse = nse.get(isin);
                const onBse = bse.get(isin);
                const primaryExchange = onNse ? "NSE" : onBse ? "BSE" : "NSE";
                const symbol = onNse?.symbol ?? onBse?.symbol ?? "";
                found.set(isin, {
                  schemeId: s.schemeId, isin, schemeName: s.schemeName,
                  amcName: s.mutualFundName ?? g.mutualFundName ?? "",
                  metal: u.metal, kind: "etf", primaryExchange,
                  nseSymbol: primaryExchange === "NSE" ? symbol : "",
                  bseSymbol: primaryExchange === "BSE" ? symbol : null,
                  upstoxKey: `${primaryExchange}_EQ|${isin}`,
                  gramsPerUnit: estimateGramsPerUnit(u.metal, nav),
                  faceValueNote: "auto-discovered; unit factor estimated from NAV",
                });
              }
            }
          }
        }
      }

      // ---- 2. Sovereign Gold Bonds from the NSE dump (instrument_type GB) ----
      for (const [isin, info] of nse) {
        if (info.type !== "GB") continue;
        if (found.has(isin)) continue;
        found.set(isin, {
          schemeId: "", isin, schemeName: info.symbol, amcName: "Government of India (RBI)",
          metal: "gold", kind: "sgb", primaryExchange: "NSE",
          nseSymbol: info.symbol, bseSymbol: null,
          upstoxKey: `NSE_EQ|${isin}`,
          gramsPerUnit: 1.0, // 1 SGB unit = 1 gram of gold by definition
          faceValueNote: "Sovereign Gold Bond; 1 unit = 1 g gold",
        });
      }

      const result = await ctx.runMutation(internal.functions.reconcileUniverse, {
        schemes: Array.from(found.values()),
      });

      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "discover_etfs", status: "ok", startedAt, finishedAt: Date.now(),
        recordCount: (result as any)?.added ?? 0,
      });
      return result;
    } catch (e: any) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "discover_etfs", status: "error", startedAt, finishedAt: Date.now(),
        errorMessage: String(e?.message ?? e),
      });
      return { ok: false, error: String(e?.message ?? e) };
    }
  },
});

function estimateGramsPerUnit(metal: "gold" | "silver", nav: number): number {
  if (!nav || nav <= 0) return metal === "gold" ? 0.01 : 1.0;
  const g = nav / REF_INR_PER_GRAM[metal];
  const snaps = [1.0, 0.5, 0.1, 0.01, 0.0016, 0.001, 0.0001];
  let best = snaps[0];
  for (const s of snaps) if (Math.abs(Math.log(g / s)) < Math.abs(Math.log(g / best))) best = s;
  return best;
}
