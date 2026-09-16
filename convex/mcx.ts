"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

/**
 * MCX gold/silver reference via Upstox — authorized, free.
 * Resolves the nearest active GOLD (1kg, ₹/10g) and SILVER (30kg, ₹/kg) futures
 * from the daily MCX instrument dump (auto-rolls on expiry), then fetches LTP via
 * the standard Market Quote V3 token. Stored normalized to ₹/gram.
 */
export const fetchMcxRefs = internalAction({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    const token = process.env.UPSTOX_ACCESS_TOKEN;
    if (!token) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "mcx_refs", status: "error", startedAt, finishedAt: Date.now(),
        errorMessage: "UPSTOX_ACCESS_TOKEN not set",
      });
      return { ok: false, reason: "no_token" };
    }
    try {
      // 1. resolve nearest active GOLD + SILVER futures from the daily MCX dump
      const res = await fetch("https://assets.upstox.com/market-quote/instruments/exchange/MCX.json.gz", {
        headers: { "User-Agent": UA },
      });
      if (!res.ok) throw new Error(`MCX dump ${res.status}`);
      const buf = await res.arrayBuffer();
      const { gunzipSync } = await import("zlib");
      const all = JSON.parse(gunzipSync(Buffer.from(buf)).toString("utf-8"));
      const now = Date.now();
      const nearest = (name: string) => {
        const futs = all
          .filter((i: any) => i?.instrument_type === "FUT" && i?.name === name && i?.asset_symbol === name && i?.expiry > now)
          .sort((a: any, b: any) => a.expiry - b.expiry);
        return futs[0] ?? null;
      };
      const goldFut = nearest("GOLD");
      const silverFut = nearest("SILVER");
      if (!goldFut || !silverFut) throw new Error("no active GOLD/SILVER future found");

      // 2. fetch LTP for both keys
      const keys = [goldFut.instrument_key, silverFut.instrument_key].join(",");
      const qres = await fetch(
        `https://api.upstox.com/v3/market-quote/ltp?instrument_key=${encodeURIComponent(keys)}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
      if (!qres.ok) throw new Error(`Upstox ltp ${qres.status}`);
      const qjson = await qres.json();
      const data = qjson?.data ?? {};
      const ltpOf = (k: string) => {
        const q = data[k] ?? data[k.replace("|", ":")] ?? Object.values<any>(data).find((x: any) => x?.instrument_token === k);
        return q?.last_price ?? null;
      };
      const goldLtp = ltpOf(goldFut.instrument_key);
      const silverLtp = ltpOf(silverFut.instrument_key);

      // 3. store normalized (gold ₹/10g → ₹/g; silver ₹/kg → ₹/g)
      if (goldLtp != null) {
        await ctx.runMutation(internal.metalRefs.upsertMetalRef, {
          metal: "gold", source: "mcx_fut", symbol: goldFut.trading_symbol,
          instrumentKey: goldFut.instrument_key, rawPrice: goldLtp, rawUnit: "per_10g",
          pricePerGram: goldLtp / 10, sourceTs: now,
        });
      }
      if (silverLtp != null) {
        await ctx.runMutation(internal.metalRefs.upsertMetalRef, {
          metal: "silver", source: "mcx_fut", symbol: silverFut.trading_symbol,
          instrumentKey: silverFut.instrument_key, rawPrice: silverLtp, rawUnit: "per_kg",
          pricePerGram: silverLtp / 1000, sourceTs: now,
        });
      }
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "mcx_refs", status: "ok", startedAt, finishedAt: Date.now(),
        recordCount: (goldLtp != null ? 1 : 0) + (silverLtp != null ? 1 : 0),
      });
      return { ok: true, gold: goldFut.trading_symbol, silver: silverFut.trading_symbol };
    } catch (e: any) {
      await ctx.runMutation(internal.functions.logFetch, {
        jobName: "mcx_refs", status: "error", startedAt, finishedAt: Date.now(),
        errorMessage: String(e?.message ?? e),
      });
      return { ok: false, error: String(e?.message ?? e) };
    }
  },
});
