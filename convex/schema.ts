import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Principles:
 * - keep source-effective time (sourceTs / navDate / asOfDate) separate from retrieval time (fetchedAt)
 * - missing, zero and stale are distinct states (fields are optional, never coerced to 0)
 * - upsert on natural keys so re-fetching never duplicates
 */
export default defineSchema({
  etfs: defineTable({
    schemeName: v.string(),
    amcName: v.string(),
    metal: v.union(v.literal("gold"), v.literal("silver")),
    // instrument kind: 'etf' (gold/silver ETF) or 'sgb' (Sovereign Gold Bond)
    kind: v.optional(v.union(v.literal("etf"), v.literal("sgb"))),
    // primary exchange this instrument's price/iNAV is read from: 'NSE' or 'BSE'
    primaryExchange: v.optional(v.union(v.literal("NSE"), v.literal("BSE"))),
    isin: v.string(),
    nseSymbol: v.string(),
    bseSymbol: v.optional(v.union(v.string(), v.null())),
    upstoxKey: v.string(), // exchange-scoped: NSE_EQ|<isin> or BSE_EQ|<isin>
    gramsPerUnit: v.number(),
    faceValueNote: v.optional(v.string()),
    amfiSchemeId: v.optional(v.string()),
    status: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_isin", ["isin"])
    .index("by_nseSymbol", ["nseSymbol"])
    .index("by_metal", ["metal"])
    .index("by_kind", ["kind"]),

  quotes: defineTable({
    etfId: v.id("etfs"),
    source: v.string(), // 'upstox'
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
    sourceTs: v.number(), // source-effective timestamp (ms)
    fetchedAt: v.number(),
  })
    .index("by_etf_time", ["etfId", "sourceTs"])
    .index("by_etf", ["etfId"]),

  inavs: defineTable({
    etfId: v.id("etfs"),
    source: v.string(), // 'nse' | 'bse'
    inav: v.optional(v.number()),
    sourceTs: v.number(),
    fetchedAt: v.number(),
  })
    .index("by_etf_time", ["etfId", "sourceTs"])
    .index("by_etf", ["etfId"]),

  navs: defineTable({
    etfId: v.id("etfs"),
    nav: v.number(),
    navDate: v.string(), // source-effective date label e.g. '11-Sep-2026'
    navDateTs: v.number(), // parsed ms for ordering
    amfiSchemeId: v.optional(v.string()),
    fetchedAt: v.number(),
  })
    .index("by_etf_date", ["etfId", "navDateTs"])
    .index("by_etf", ["etfId"]),

  trackingMetrics: defineTable({
    etfId: v.id("etfs"),
    type: v.union(v.literal("tracking_error"), v.literal("tracking_difference")),
    period: v.string(), // '1y' | '3y' | '5y' | '10y' | 'since_launch' | 'daily'
    value: v.optional(v.number()),
    benchmark: v.optional(v.string()),
    asOfDate: v.string(),
    asOfTs: v.number(),
    fetchedAt: v.number(),
  })
    .index("by_etf_type", ["etfId", "type"])
    .index("by_etf", ["etfId"]),

  sources: defineTable({
    sourceId: v.string(),
    name: v.string(),
    url: v.optional(v.string()),
    termsNote: v.optional(v.string()),
    lastVerifiedAt: v.optional(v.number()),
    status: v.optional(v.string()),
  }).index("by_sourceId", ["sourceId"]),

  fetchLogs: defineTable({
    jobName: v.string(),
    etfId: v.optional(v.id("etfs")),
    status: v.string(), // 'ok' | 'error' | 'partial'
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    recordCount: v.optional(v.number()),
  }).index("by_job", ["jobName", "startedAt"]),

  // Sovereign Gold Bond tranche registry (static dimension; one row per tranche ever issued)
  sgbTranches: defineTable({
    series: v.string(),           // e.g. '2020-21 Series VIII'
    isin: v.string(),
    nseSymbol: v.optional(v.union(v.string(), v.null())),
    issueDate: v.string(),        // ISO date
    issueDateTs: v.number(),
    issuePrice: v.number(),       // ₹ per gram at issue
    maturityDateTs: v.number(),   // issueDate + 8 years
    firstPrematureTs: v.number(), // issueDate + 5 years
    couponRate: v.number(),       // 0.025
    unitsSubscribed: v.optional(v.union(v.number(), v.null())),
    redemptionPrice: v.optional(v.union(v.number(), v.null())), // set once matured/redeemed
    status: v.string(),           // 'trading' | 'matured'
    updatedAt: v.number(),
  })
    .index("by_isin", ["isin"])
    .index("by_status", ["status"])
    .index("by_maturity", ["maturityDateTs"]),
});
