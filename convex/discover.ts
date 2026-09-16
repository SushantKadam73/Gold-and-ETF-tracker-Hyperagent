"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

// Reference ₹/gram used only to *estimate* grams-per-unit for a newly discovered fund,
// so it can go live immediately. Self-correcting: gramsPerUnit affects only the ₹/gram
// normalization display, not any stored price, so an estimate never corrupts data.
const REF_INR_PER_GRAM = { gold: 10900, silver: 130 } as const;

/**
 * Full-lifecycle auto-discovery of gold/silver ETFs from AMFI. Fully automatic:
 *  - ADDED:    new ISIN → resolve NSE symbol from the Upstox instrument dump + estimate
 *              grams-per-unit from NAV, insert as ACTIVE so it shows data immediately.
 *  - RENAMED:  same ISIN, changed schemeName → update the name in place.
 *  - DELISTED: in our universe but absent from AMFI → mark status 'inactive' (kept for history).
 * Runs daily. No manual step to add, remove or rename a fund.
 */
export const discoverEtfs = internalAction({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    try {
      const found = new Map<string, any>();
      const urls: Array<{ metal: "gold" | "silver"; url: string; silver?: boolean }> = [
        { metal: "gold", url: "https://www.amfiindia.com/api/latest-nav?type=&mfid=all&category=Other%20Scheme%20-%20Gold%20ETF" },
        { metal: "silver", url: "https://www.amfiindia.com/api/latest-nav?type=&mfid=all&category=Other%20Scheme%20-%20Other%20%20ETFs", silver: true },
      ];
      for (const u of urls) {
        const res = await fetch(u.url, { headers: { "User-Agent": UA, Accept: "application/json" } });
        if (!res.ok) throw new Error(`AMFI ${res.status}`);
        const json = await res.json();
        for (const c of json?.data ?? []) {
          for (const cat of c?.categories ?? []) {
            for (const g of cat?.groups ?? []) {
              for (const s of g?.schemes ?? []) {
                if (u.silver && !/silver/i.test(s?.schemeName ?? "")) continue;
                if (!s?.ISINPrimary || !s?.schemeName) continue;
                found.set(s.ISINPrimary, {
                  schemeId: s.schemeId,
                  isin: s.ISINPrimary,
                  schemeName: s.schemeName,
                  amcName: s.mutualFundName ?? g.mutualFundName ?? "",
                  metal: u.metal,
                  nav: parseFloat(s.netAssetValue) || 0,
                });
              }
            }
          }
        }
      }

      // Resolve NSE symbols for any new ISINs from the Upstox instrument dump (best-effort)
      const nseByIsin = new Map<string, string>();
      try {
        const res = await fetch("https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz", {
          headers: { "User-Agent": UA },
        });
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const { gunzipSync } = await import("zlib");
          const arr = JSON.parse(gunzipSync(Buffer.from(buf)).toString("utf-8"));
          for (const i of arr) if (i?.isin && i?.trading_symbol) nseByIsin.set(i.isin, i.trading_symbol);
        }
      } catch { /* symbol resolution is best-effort; fund is still added */ }

      const schemes = Array.from(found.values()).map((s) => ({
        ...s,
        nseSymbol: nseByIsin.get(s.isin) ?? "",
        gramsPerUnit: estimateGramsPerUnit(s.metal, s.nav),
      }));

      const result = await ctx.runMutation(internal.functions.reconcileUniverse, { schemes });

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
