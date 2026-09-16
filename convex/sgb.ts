import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { SGB_REGISTRY } from "./seed/sgbRegistry";

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const COUPON = 0.025; // 2.5% p.a. on issue price, semi-annual

/** Seed / upsert the full 67-tranche SGB registry. Idempotent. Run once, then on registry updates. */
export const seedSgbRegistry = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let upserted = 0;
    for (const s of SGB_REGISTRY) {
      const issueTs = Date.parse(s.issueDate);
      const maturityTs = issueTs + 8 * YEAR_MS;
      const firstPrematureTs = issueTs + 5 * YEAR_MS;
      const status = s.redemptionPrice != null ? "matured" : "trading";
      const existing = await ctx.db.query("sgbTranches").withIndex("by_isin", (q) => q.eq("isin", s.isin)).unique();
      const doc = {
        series: s.series,
        isin: s.isin,
        nseSymbol: s.nseSymbol,
        issueDate: s.issueDate,
        issueDateTs: issueTs,
        issuePrice: s.issuePrice,
        maturityDateTs: maturityTs,
        firstPrematureTs,
        couponRate: COUPON,
        unitsSubscribed: s.unitsSubscribed,
        redemptionPrice: s.redemptionPrice,
        status,
        updatedAt: now,
      };
      if (existing) await ctx.db.patch(existing._id, doc);
      else await ctx.db.insert("sgbTranches", doc);
      upserted++;
    }
    return { upserted };
  },
});

/** All tranches joined with their latest quote (for the SGB page). */
export const sgbList = query({
  args: {},
  handler: async (ctx) => {
    const tranches = await ctx.db.query("sgbTranches").collect();
    const out = [] as any[];
    for (const t of tranches) {
      // quotes are stored keyed by the etf table id; find the matching instrument by ISIN
      const instrument = await ctx.db.query("etfs").withIndex("by_isin", (q) => q.eq("isin", t.isin)).unique();
      let quote = null;
      if (instrument) {
        quote = await ctx.db.query("quotes").withIndex("by_etf_time", (q) => q.eq("etfId", instrument._id)).order("desc").first();
      }
      out.push({ tranche: t, quote });
    }
    return out;
  },
});

export const sgbDetail = query({
  args: { isin: v.string() },
  handler: async (ctx, { isin }) => {
    const tranche = await ctx.db.query("sgbTranches").withIndex("by_isin", (q) => q.eq("isin", isin)).unique();
    if (!tranche) return null;
    const instrument = await ctx.db.query("etfs").withIndex("by_isin", (q) => q.eq("isin", isin)).unique();
    let quote = null;
    if (instrument) {
      quote = await ctx.db.query("quotes").withIndex("by_etf_time", (q) => q.eq("etfId", instrument._id)).order("desc").first();
    }
    return { tranche, quote };
  },
});
