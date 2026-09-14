"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

function num(x: any): number | undefined {
  const n = typeof x === "string" ? parseFloat(x) : x;
  return typeof n === "number" && isFinite(n) ? n : undefined;
}

/** Parse 'dd-Mmm-yyyy' (e.g. '11-Sep-2026') to ms. */
function parseAmfiDate(s: string): number {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const m = s.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return Date.now();
  return Date.UTC(+m[3], months[m[2].toLowerCase()] ?? 0, +m[1]);
}

/** AMFI latest NAV — gold category + silver regex over Other ETFs. Daily after close. */
export const fetchAmfiNav = internalAction({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    try {
      let count = 0;
      const urls = [
        "https://www.amfiindia.com/api/latest-nav?type=&mfid=all&category=Other%20Scheme%20-%20Gold%20ETF",
        "https://www.amfiindia.com/api/latest-nav?type=&mfid=all&category=Other%20Scheme%20-%20Other%20%20ETFs",
      ];
      for (const url of urls) {
        const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
        if (!res.ok) throw new Error(`AMFI ${res.status}`);
        const json = await res.json();
        const isSilverList = url.includes("Other%20%20ETFs");
        for (const c of json?.data ?? []) {
          for (const cat of c?.categories ?? []) {
            for (const g of cat?.groups ?? []) {
              for (const s of g?.schemes ?? []) {
                if (isSilverList && !/silver/i.test(s?.schemeName ?? "")) continue;
                const nav = num(s?.netAssetValue);
                if (nav == null || !s?.ISINPrimary || !s?.date) continue;
                await ctx.runMutation(internal.functions.upsertNav, {
                  isin: s.ISINPrimary,
                  nav,
                  navDate: s.date,
                  navDateTs: parseAmfiDate(s.date),
                  amfiSchemeId: s.schemeId,
                });
                count++;
              }
            }
          }
        }
      }
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "amfi_nav",
        status: "ok",
        startedAt,
        finishedAt: Date.now(),
        recordCount: count,
      });
      return { ok: true, count };
    } catch (e: any) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "amfi_nav",
        status: "error",
        startedAt,
        finishedAt: Date.now(),
        errorMessage: String(e?.message ?? e),
      });
      return { ok: false, error: String(e?.message ?? e) };
    }
  },
});

/** AMFI tracking error — weekdays only. strdt defaults to 'today' (IST) formatted dd-Mmm-yyyy. */
export const fetchAmfiTrackingError = internalAction({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    try {
      const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
      }).replace(/ /g, "-");
      const url = `https://www.amfiindia.com/api/tracking-error-data?MF_ID=all&strdt=${encodeURIComponent(today)}`;
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) throw new Error(`AMFI TE ${res.status}`);
      const json = await res.json();
      const rows = json?.data ?? [];
      let count = 0;
      for (const r of rows) {
        if (!/etf/i.test(r?.Scheme_Name ?? "")) continue;
        if (!/gold|silver/i.test(r?.Scheme_Name ?? "")) continue;
        const value = num(r?.RegularPercent);
        const dateStr = r?.date ?? today;
        await ctx.runMutation(internal.functions.upsertTrackingMetric, {
          schemeName: r.Scheme_Name,
          type: "tracking_error",
          period: "daily",
          value,
          benchmark: r?.Benchmark,
          asOfDate: dateStr,
          asOfTs: parseAmfiDate(dateStr),
        });
        count++;
      }
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "amfi_te",
        status: "ok",
        startedAt,
        finishedAt: Date.now(),
        recordCount: count,
      });
      return { ok: true, count };
    } catch (e: any) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "amfi_te",
        status: "error",
        startedAt,
        finishedAt: Date.now(),
        errorMessage: String(e?.message ?? e),
      });
      return { ok: false, error: String(e?.message ?? e) };
    }
  },
});

/** AMFI tracking difference — monthly, 1st of month. */
export const fetchAmfiTrackingDifference = internalAction({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    try {
      const firstOfMonth = new Date().toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
      }).replace(/^\d{2}/, "01").replace(/ /g, "-");
      const url = `https://www.amfiindia.com/api/tracking-difference?MF_ID=all&date=${encodeURIComponent(firstOfMonth)}`;
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) throw new Error(`AMFI TD ${res.status}`);
      const json = await res.json();
      const rows = json?.data ?? [];
      let count = 0;
      for (const r of rows) {
        if (!/etf/i.test(r?.Scheme_Name ?? "")) continue;
        if (!/gold|silver/i.test(r?.Scheme_Name ?? "")) continue;
        const asOfTs = parseAmfiDate(r?.date ?? firstOfMonth);
        const periods: Array<[string, any]> = [
          ["1y", r?.Y1_R], ["3y", r?.Y3_R], ["5y", r?.Y5_R], ["10y", r?.Y10_R], ["since_launch", r?.ReturnLaunch_R],
        ];
        for (const [period, val] of periods) {
          await ctx.runMutation(internal.functions.upsertTrackingMetric, {
            schemeName: r.Scheme_Name,
            type: "tracking_difference",
            period,
            value: num(val),
            benchmark: r?.Benchmark,
            asOfDate: r?.date ?? firstOfMonth,
            asOfTs,
          });
          count++;
        }
      }
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "amfi_td",
        status: "ok",
        startedAt,
        finishedAt: Date.now(),
        recordCount: count,
      });
      return { ok: true, count };
    } catch (e: any) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "amfi_td",
        status: "error",
        startedAt,
        finishedAt: Date.now(),
        errorMessage: String(e?.message ?? e),
      });
      return { ok: false, error: String(e?.message ?? e) };
    }
  },
});
