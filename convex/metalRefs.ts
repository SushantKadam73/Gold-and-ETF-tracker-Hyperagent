import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

// Metal reference storage + reads. Runs in the Convex runtime (no "use node").

export const upsertMetalRef = internalMutation({
  args: {
    metal: v.string(), source: v.string(), symbol: v.optional(v.string()),
    instrumentKey: v.optional(v.string()), rawPrice: v.number(), rawUnit: v.string(),
    pricePerGram: v.optional(v.number()), sourceTs: v.number(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("metalRefs", { ...a, fetchedAt: Date.now() });
  },
});

/** Latest MCX reference per metal. */
export const latestMetalRefs = query({
  args: {},
  handler: async (ctx) => {
    const out: Record<string, any> = {};
    for (const metal of ["gold", "silver"] as const) {
      const r = await ctx.db
        .query("metalRefs")
        .withIndex("by_metal_time", (q) => q.eq("metal", metal))
        .order("desc")
        .filter((q) => q.eq(q.field("source"), "mcx_fut"))
        .first();
      out[metal] = r ?? null;
    }
    return out;
  },
});
