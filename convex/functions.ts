import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ETF_UNIVERSE } from "./seed/etfUniverse";

/** Seed / upsert the verified ETF universe. Run once after deploy, then on universe changes. */
export const seedUniverse = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let upserted = 0;
    for (const s of ETF_UNIVERSE) {
      const existing = await ctx.db
        .query("etfs")
        .withIndex("by_isin", (q) => q.eq("isin", s.isin))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          schemeName: s.schemeName,
          amcName: s.amcName,
          metal: s.metal,
          nseSymbol: s.nseSymbol,
          bseSymbol: s.bseSymbol,
          upstoxKey: s.upstoxKey,
          gramsPerUnit: s.gramsPerUnit,
          faceValueNote: s.faceValueNote,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("etfs", {
          schemeName: s.schemeName,
          amcName: s.amcName,
          metal: s.metal,
          isin: s.isin,
          nseSymbol: s.nseSymbol,
          bseSymbol: s.bseSymbol,
          upstoxKey: s.upstoxKey,
          gramsPerUnit: s.gramsPerUnit,
          faceValueNote: s.faceValueNote,
          status: "active",
          updatedAt: now,
        });
      }
      upserted++;
    }
    return { upserted };
  },
});

export const upsertQuote = internalMutation({
  args: {
    isin: v.string(),
    ltp: v.optional(v.number()),
    open: v.optional(v.number()),
    high: v.optional(v.number()),
    low: v.optional(v.number()),
    close: v.optional(v.number()),
    bidPrice: v.optional(v.number()),
    bidQty: v.optional(v.number()),
    askPrice: v.optional(v.number()),
    askQty: v.optional(v.number()),
    lastTradeTime: v.optional(v.number()),
    sourceTs: v.number(),
  },
  handler: async (ctx, a) => {
    const etf = await ctx.db.query("etfs").withIndex("by_isin", (q) => q.eq("isin", a.isin)).unique();
    if (!etf) return { skipped: a.isin };
    const now = Date.now();
    const existing = await ctx.db
      .query("quotes")
      .withIndex("by_etf_time", (q) => q.eq("etfId", etf._id).eq("sourceTs", a.sourceTs))
      .first();
    const doc = {
      etfId: etf._id,
      source: "upstox",
      ltp: a.ltp,
      open: a.open,
      high: a.high,
      low: a.low,
      close: a.close,
      bidPrice: a.bidPrice,
      bidQty: a.bidQty,
      askPrice: a.askPrice,
      askQty: a.askQty,
      lastTradeTime: a.lastTradeTime,
      sourceTs: a.sourceTs,
      fetchedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("quotes", doc);
    return { ok: a.isin };
  },
});

export const upsertInav = internalMutation({
  args: {
    nseSymbol: v.string(),
    inav: v.optional(v.number()),
    sourceTs: v.number(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const etf = await ctx.db.query("etfs").withIndex("by_nseSymbol", (q) => q.eq("nseSymbol", a.nseSymbol)).unique();
    if (!etf) return { skipped: a.nseSymbol };
    const now = Date.now();
    const existing = await ctx.db
      .query("inavs")
      .withIndex("by_etf_time", (q) => q.eq("etfId", etf._id).eq("sourceTs", a.sourceTs))
      .first();
    const doc = { etfId: etf._id, source: a.source ?? "nse", inav: a.inav, sourceTs: a.sourceTs, fetchedAt: now };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("inavs", doc);
    return { ok: a.nseSymbol };
  },
});

export const upsertNav = internalMutation({
  args: {
    isin: v.string(),
    nav: v.number(),
    navDate: v.string(),
    navDateTs: v.number(),
    amfiSchemeId: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const etf = await ctx.db.query("etfs").withIndex("by_isin", (q) => q.eq("isin", a.isin)).unique();
    if (!etf) return { skipped: a.isin };
    const existing = await ctx.db
      .query("navs")
      .withIndex("by_etf_date", (q) => q.eq("etfId", etf._id).eq("navDateTs", a.navDateTs))
      .first();
    const doc = {
      etfId: etf._id,
      nav: a.nav,
      navDate: a.navDate,
      navDateTs: a.navDateTs,
      amfiSchemeId: a.amfiSchemeId,
      fetchedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("navs", doc);
    return { ok: a.isin };
  },
});

export const upsertTrackingMetric = internalMutation({
  args: {
    schemeName: v.string(),
    type: v.union(v.literal("tracking_error"), v.literal("tracking_difference")),
    period: v.string(),
    value: v.optional(v.number()),
    benchmark: v.optional(v.string()),
    asOfDate: v.string(),
    asOfTs: v.number(),
  },
  handler: async (ctx, a) => {
    // match by scheme name against the universe (AMFI TE/TD rows do not carry ISIN)
    const seed = ETF_UNIVERSE.find(
      (s) => normalize(s.schemeName) === normalize(a.schemeName)
    );
    if (!seed) return { skipped: a.schemeName };
    const etf = await ctx.db.query("etfs").withIndex("by_isin", (q) => q.eq("isin", seed.isin)).unique();
    if (!etf) return { skipped: a.schemeName };
    const now = Date.now();
    const existing = await ctx.db
      .query("trackingMetrics")
      .withIndex("by_etf_type", (q) => q.eq("etfId", etf._id).eq("type", a.type))
      .filter((q) => q.eq(q.field("period"), a.period))
      .first();
    const doc = {
      etfId: etf._id,
      type: a.type,
      period: a.period,
      value: a.value,
      benchmark: a.benchmark,
      asOfDate: a.asOfDate,
      asOfTs: a.asOfTs,
      fetchedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("trackingMetrics", doc);
    return { ok: a.schemeName };
  },
});

export const logFetch = internalMutation({
  args: {
    jobName: v.string(),
    status: v.string(),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    recordCount: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("fetchLogs", { ...a });
  },
});

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/* ------------------------------ queries ------------------------------ */

/** Latest snapshot per ETF for the dashboard: ETF + latest quote + latest inav + latest nav. */
export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const etfs = await ctx.db.query("etfs").collect();
    const out = [] as any[];
    for (const e of etfs) {
      const quote = await ctx.db
        .query("quotes")
        .withIndex("by_etf_time", (q) => q.eq("etfId", e._id))
        .order("desc")
        .first();
      const inav = await ctx.db
        .query("inavs")
        .withIndex("by_etf_time", (q) => q.eq("etfId", e._id))
        .order("desc")
        .first();
      const nav = await ctx.db
        .query("navs")
        .withIndex("by_etf_date", (q) => q.eq("etfId", e._id))
        .order("desc")
        .first();
      out.push({ etf: e, quote, inav, nav });
    }
    return out;
  },
});

export const etfDetail = query({
  args: { isin: v.string() },
  handler: async (ctx, { isin }) => {
    const etf = await ctx.db.query("etfs").withIndex("by_isin", (q) => q.eq("isin", isin)).unique();
    if (!etf) return null;
    const quote = await ctx.db.query("quotes").withIndex("by_etf_time", (q) => q.eq("etfId", etf._id)).order("desc").first();
    const inav = await ctx.db.query("inavs").withIndex("by_etf_time", (q) => q.eq("etfId", etf._id)).order("desc").first();
    const nav = await ctx.db.query("navs").withIndex("by_etf_date", (q) => q.eq("etfId", etf._id)).order("desc").first();
    const metrics = await ctx.db.query("trackingMetrics").withIndex("by_etf", (q) => q.eq("etfId", etf._id)).collect();
    return { etf, quote, inav, nav, metrics };
  },
});
