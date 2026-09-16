"use client";

export const dynamic = "force-dynamic";

import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { use } from "react";
import Link from "next/link";
import { formatINR, istTime, pctClass } from "../../../lib/format";
import {
  SgbTranche, nextCouponDate, remainingCoupons, daysToMaturity,
  inPrematureWindow, premiumToGold, returnSinceIssue, ytm,
} from "../../../lib/sgb";

const sgbDetailRef = makeFunctionReference<"query", { isin: string }, any>("sgb:sgbDetail") as any;
const hasBackend = !!process.env.NEXT_PUBLIC_CONVEX_URL;
const GOLD_REF_PER_GRAM = 10900; // display fallback; live page uses GOLDBEES-derived value

export default function SgbDetailPage({ params }: { params: Promise<{ isin: string }> }) {
  const { isin } = use(params);
  if (!hasBackend) return <p className="py-20 text-center text-sm text-zinc-500">Backend not connected yet.</p>;
  return <Inner isin={isin} />;
}

function Inner({ isin }: { isin: string }) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const data = useQuery(sgbDetailRef, { isin });
  if (data === undefined) return <p className="py-20 text-center text-sm text-zinc-500">Loading…</p>;
  if (data === null) return <p className="py-20 text-center text-sm text-zinc-500">Tranche not found.</p>;

  const t: SgbTranche = data.tranche;
  const quote = data.quote;
  const now = Date.now();
  const ltp = quote?.ltp ?? null;
  const goldRef = GOLD_REF_PER_GRAM;
  const premGold = premiumToGold(ltp, goldRef);
  const ret = returnSinceIssue(ltp, t.issuePrice);
  const ytmPre = ltp && t.status === "trading" ? ytm(t, ltp, goldRef, {}, now) : null;
  const ytmPost = ltp && t.status === "trading" ? ytm(t, ltp, goldRef, { slabPct: 30, secondaryBuyer: true }, now) : null;
  const nc = nextCouponDate(t, now);
  const coupons = remainingCoupons(t, now);
  const dtm = daysToMaturity(t, now);
  const premature = inPrematureWindow(t, now);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/sgb" className="text-xs text-zinc-500 hover:underline dark:text-zinc-400">← All SGBs</Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t.series}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t.nseSymbol ?? t.isin} · ISIN {t.isin} · issued {new Date(t.issueDateTs).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card title="Issue price" value={formatINR(t.issuePrice)} sub="per gram, at issue" />
        <Card title="Current price" value={t.status === "matured" ? "redeemed" : formatINR(ltp)} sub={quote?.sourceTs ? istTime(quote.sourceTs) : "—"} />
        <Card title="vs Gold reference" value={premGold == null ? "—" : `${premGold.toFixed(2)}%`} sub={premGold != null ? (premGold < 0 ? "below gold = discount" : "above gold = premium") : ""} className={pctClass(premGold)} />
        <Card title="Since issue (price)" value={ret == null ? "—" : `${ret >= 0 ? "+" : ""}${ret.toFixed(0)}%`} sub="ex-coupon, ex-tax" className={pctClass(ret)} />
      </div>

      {t.status === "trading" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card title="YTM (pre-tax)" value={ytmPre == null ? "—" : `${ytmPre.toFixed(1)}%`} sub="gold flat + coupons" />
          <Card title="YTM (post-tax, secondary)" value={ytmPost == null ? "—" : `${ytmPost.toFixed(1)}%`} sub="30% slab · 12.5% LTCG" />
          <Card title="Matures in" value={dtm >= 0 ? `${Math.floor(dtm / 365)}y ${Math.round((dtm % 365) / 30)}m` : "—"} sub={new Date(t.maturityDateTs).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Redeemed</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{t.redemptionPrice != null ? formatINR(t.redemptionPrice) : "—"}</div>
          <div className="mt-1 text-xs text-zinc-400">
            Price return {t.redemptionPrice != null ? `+${(((t.redemptionPrice - t.issuePrice) / t.issuePrice) * 100).toFixed(0)}%` : "—"} plus 2.5% annual coupons over the holding period.
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cash-flow calendar</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">Coupon</div>
            <p className="text-sm">2.5% p.a. on {formatINR(t.issuePrice)} = {formatINR((t.issuePrice * 0.025) / 2)} every 6 months</p>
            <p className="mt-1 text-xs text-zinc-400">Next coupon: {nc ? new Date(nc).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
            {premature ? <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">Eligible for premature redemption (5+ years).</p> : null}
          </div>
          <div>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">Remaining coupon dates ({coupons.length})</div>
            <p className="mt-1 max-h-32 overflow-y-auto text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {coupons.length ? coupons.map((c) => new Date(c).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })).join(" · ") : "—"}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        1 SGB unit = 1 gram of gold. Redemption price is the 3-day average of IBJA 999 gold. Tax: interest at your slab;
        maturity capital gains tax-free only for original subscribers (Finance Act 2026) — secondary buyers pay 12.5% LTCG.
      </p>
    </div>
  );
}

function Card({ title, value, sub, className }: { title: string; value: string; sub?: string; className?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${className ?? ""}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-400">{sub}</div> : null}
    </div>
  );
}
