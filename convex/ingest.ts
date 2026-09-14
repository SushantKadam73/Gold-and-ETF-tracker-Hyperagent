"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { UPSTOX_KEYS } from "./seed/etfUniverse";

/**
 * Upstox Market Quote V3 (full) — batched for all tracked ISINs.
 * Requires UPSTOX_ACCESS_TOKEN set as a Convex environment variable (server-side only).
 */
export const fetchUpstoxQuotes = internalAction({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    const token = process.env.UPSTOX_ACCESS_TOKEN;
    if (!token) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "upstox_quotes",
        status: "error",
        startedAt,
        finishedAt: Date.now(),
        errorMessage: "UPSTOX_ACCESS_TOKEN not set",
      });
      return { ok: false, reason: "no_token" };
    }
    try {
      const keys = UPSTOX_KEYS.join(",");
      const url = `https://api.upstox.com/v3/market-quote/quotes?instrument_key=${encodeURIComponent(keys)}&mode=full`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Upstox ${res.status}`);
      const json = await res.json();
      const data = json?.data ?? {};
      const now = Date.now();
      let count = 0;
      for (const [key, q] of Object.entries<any>(data)) {
        const isin = key.split("|")[1] ?? q?.instrument_token?.split("|")[1];
        if (!isin) continue;
        const depth = q?.depth ?? {};
        const bestBid = depth?.buy?.[0];
        const bestAsk = depth?.sell?.[0];
        await ctx.runMutation(internal.functions.upsertQuote, {
          isin,
          ltp: num(q?.last_price),
          open: num(q?.ohlc?.open),
          high: num(q?.ohlc?.high),
          low: num(q?.ohlc?.low),
          close: num(q?.ohlc?.close),
          bidPrice: num(bestBid?.price),
          bidQty: num(bestBid?.quantity),
          askPrice: num(bestAsk?.price),
          askQty: num(bestAsk?.quantity),
          lastTradeTime: q?.last_trade_time ? Date.parse(q.last_trade_time) : undefined,
          sourceTs: now,
        });
        count++;
      }
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "upstox_quotes",
        status: "ok",
        startedAt,
        finishedAt: Date.now(),
        recordCount: count,
      });
      return { ok: true, count };
    } catch (e: any) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "upstox_quotes",
        status: "error",
        startedAt,
        finishedAt: Date.now(),
        errorMessage: String(e?.message ?? e),
      });
      return { ok: false, error: String(e?.message ?? e) };
    }
  },
});

/**
 * NSE ETF data (nav + inav per ETF). NSE requires a browser-like session cookie;
 * we obtain one from the homepage then call the marketWatch ETF endpoint.
 */
export const fetchNseInav = internalAction({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    try {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
      const home = await fetch("https://www.nseindia.com", { headers: { "User-Agent": ua } });
      const cookie = home.headers.get("set-cookie") ?? "";
      const res = await fetch(
        "https://www.nseindia.com/api/NextApi/apiClient/marketWatchApi?functionName=getETFData&parent=all&child=all",
        {
          headers: {
            "User-Agent": ua,
            Accept: "application/json",
            Referer: "https://www.nseindia.com/market-data/exchange-traded-funds-etf",
            Cookie: cookie,
          },
        }
      );
      if (!res.ok) throw new Error(`NSE ${res.status}`);
      const json = await res.json();
      const rows = json?.data?.data ?? [];
      const ts = json?.data?.timestamp ? Date.parse(json.data.timestamp) : Date.now();
      let count = 0;
      for (const r of rows) {
        if (!r?.symbol) continue;
        await ctx.runMutation(internal.functions.upsertInav, {
          nseSymbol: r.symbol,
          inav: num(r.inav),
          sourceTs: ts,
          source: "nse",
        });
        count++;
      }
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "nse_inav",
        status: "ok",
        startedAt,
        finishedAt: Date.now(),
        recordCount: count,
      });
      return { ok: true, count };
    } catch (e: any) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "nse_inav",
        status: "error",
        startedAt,
        finishedAt: Date.now(),
        errorMessage: String(e?.message ?? e),
      });
      return { ok: false, error: String(e?.message ?? e) };
    }
  },
});

function num(x: any): number | undefined {
  const n = typeof x === "string" ? parseFloat(x) : x;
  return typeof n === "number" && isFinite(n) ? n : undefined;
}
