"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

interface AmfiScheme {
  schemeId: string; ISINPrimary: string; schemeName: string;
  date: string; netAssetValue: string;
}

/**
 * Auto-discover new gold/silver ETFs from AMFI.
 * Fetches the gold category + silver-regex over Other ETFs, diffs against the
 * seeded universe by ISIN, and inserts new funds with status 'pending_review'
 * (NOT live until reviewed) because grams-per-unit must be verified per fund.
 * Returns the list of newly discovered candidates.
 */
export const discoverNewEtfs = internalAction({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    try {
      const found: AmfiScheme[] = [];
      const urls = [
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
                if (s?.ISINPrimary && s?.schemeName) found.push({ ...s, _metal: u.metal } as any);
              }
            }
          }
        }
      }
      const discovered = await ctx.runMutation(internal.functions.registerDiscovered, { schemes: found });
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "discover_etfs", status: "ok", startedAt, finishedAt: Date.now(),
        recordCount: (discovered as any)?.added ?? 0,
      });
      return discovered;
    } catch (e: any) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "discover_etfs", status: "error", startedAt, finishedAt: Date.now(),
        errorMessage: String(e?.message ?? e),
      });
      return { ok: false, error: String(e?.message ?? e) };
    }
  },
});
