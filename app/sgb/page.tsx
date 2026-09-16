"use client";

export const dynamic = "force-dynamic";

import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import Link from "next/link";
import { formatINR, istTime, pctClass } from "../../lib/format";
import {
  SgbTranche, nextCouponDate, daysToMaturity, inPrematureWindow,
  premiumToGold, returnSinceIssue, ytm,
} from "../../lib/sgb";

const sgbListRef = makeFunctionReference<"query", Record<string, never>, any[]>("sgb:sgbList") as any;
const dashboardRef = makeFunctionReference<"query", Record<string, never>, any[]>("functions:dashboard") as any;
const hasBackend = !!process.env.NEXT_PUBLIC_CONVEX_URL;

// Gold reference ₹/gram derived from GOLDBEES (≈0.01 g/unit) so it self-updates without scraping.
const GOLDBEES_ISIN = "INF204KB17I5";
const GOLDBEES_GPU = 0.01;

export default function SgbPage() {
  if (!hasBackend) {
    return <p className="py-20 text-center text-sm text-zinc-500">Backend not connected yet.</p>;
  }
  return <SgbInner />;
}

function SgbInner() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rows = useQuery(sgbListRef, {});
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dash = useQuery(dashboardRef, {});

  if (rows === undefined || dash === undefined) {
    return <p className="py-20 text-center text-sm text-zinc-500">Loading SGBs…</p>;
  }

  // gold reference from GOLDBEES NAV (EOD) — public AMFI data
  const goldbees = (dash as any[]).find((r: any) => r.etf.isin === GOLDBEES_ISIN);
  const goldNavPerGram = goldbees?.nav?.nav != null ? goldbees.nav.nav / GOLDBEES_GPU : null;
  const goldRefTs = goldbees?.nav?.navDateTs ?? null;

  const now = Date.now();
  const trading = (rows as any[]).filter((r) => r.tranche.status === "trading");
  const matured = (rows as any[]).filter((r) => r.tranche.status === "matured");
  // sort trading by nearest maturity
  trading.sort((a, b) => a.tranche.maturityDateTs - b.tranche.maturityDateTs);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Sovereign Gold Bonds</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          All 67 tranches from Nov 2015 to Feb 2024 (scheme closed). 2.5% p.a. coupon on issue price,
          semi-annual. Redemption at the 3-day IBJA gold average. Gold reference: GOLDBEES NAV
          {goldNavPerGram ? ` (${formatINR(goldNavPerGram)}/g, EOD)` : ""}.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Buying an SGB below the gold reference means buying gold at a discount <em>plus</em> a 2.5% coupon.
        YTM assumes gold is flat at the reference price and adds remaining coupons; post-tax assumes a
        secondary buyer (12.5% LTCG on redemption gain, coupon taxed at a 30% slab). LTP can be stale on
        illiquid tranches — check the "Updated" time.
      </div>

      <Section title={`Trading (${trading.length})`} rows={trading} goldRef={goldNavPerGram} goldRefTs={goldRefTs} now={now} />
      <MaturedSection rows={matured} now={now} />
    </div>
  );
}

function Section({ title, rows, goldRef, goldRefTs, now }: { title: string; rows: any[]; goldRef: number | null; goldRefTs: number | null; now: number }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">Tranche</th>
              <th className="px-3 py-2 text-right font-medium">Issue price</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">vs Gold</th>
              <th className="px-3 py-2 text-right font-medium">YTM</th>
              <th className="px-3 py-2 text-right font-medium">Next coupon</th>
              <th className="px-3 py-2 text-right font-medium">Matures</th>
              <th className="px-3 py-2 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row key={r.tranche._id} r={r} goldRef={goldRef} now={now} />
            ))}
          </tbody>
        </table>
      </div>
      {goldRefTs ? <p className="mt-1 text-xs text-zinc-400">Gold reference as of {istTime(goldRefTs)} (EOD).</p> : null}
    </section>
  );
}

function Row({ r, goldRef, now }: { r: any; goldRef: number | null; now: number }) {
  const t: SgbTranche = r.tranche;
  const ltp = r.quote?.ltp ?? null;
  const premGold = premiumToGold(ltp, goldRef);
  const ytmPre = ltp && goldRef ? ytm(t, ltp, goldRef, {}, now) : null;
  const nc = nextCouponDate(t, now);
  const dtm = daysToMaturity(t, now);
  const stale = r.quote?.lastTradeTime ? now - r.quote.lastTradeTime > 24 * 3600 * 1000 : true;
  const premature = inPrematureWindow(t, now);

  return (
    <tr className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/60">
      <td className="px-3 py-2">
        <Link href={`/sgb/${t.isin}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
          {t.nseSymbol ?? t.series}
        </Link>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {t.series}
          {premature ? <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">premature window</span> : null}
        </div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatINR(t.issuePrice)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatINR(ltp)}
        {stale && ltp ? <div className="text-[10px] text-amber-500">stale</div> : null}
      </td>
      <td className={`px-3 py-2 text-right tabular-nums ${pctClass(premGold)}`}>
        {premGold == null ? "—" : `${premGold.toFixed(2)}%`}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{ytmPre == null ? "—" : `${ytmPre.toFixed(1)}%`}</td>
      <td className="px-3 py-2 text-right text-xs text-zinc-500 dark:text-zinc-400">{nc ? new Date(nc).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</td>
      <td className="px-3 py-2 text-right text-xs text-zinc-500 dark:text-zinc-400">{dtm >= 0 ? `${Math.floor(dtm / 365)}y ${Math.round((dtm % 365) / 30)}m` : "matured"}</td>
      <td className="px-3 py-2 text-right text-xs text-zinc-400">{r.quote?.sourceTs ? istTime(r.quote.sourceTs) : "—"}</td>
    </tr>
  );
}

function MaturedSection({ rows, now }: { rows: any[]; now: number }) {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.tranche.maturityDateTs - a.tranche.maturityDateTs);
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Matured / Redeemed ({rows.length})
      </h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">Tranche</th>
              <th className="px-3 py-2 text-right font-medium">Issue price</th>
              <th className="px-3 py-2 text-right font-medium">Redeemed at</th>
              <th className="px-3 py-2 text-right font-medium">Price return</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const t: SgbTranche = r.tranche;
              const ret = t.redemptionPrice != null ? returnSinceIssue(t.redemptionPrice, t.issuePrice) : null;
              return (
                <tr key={t._id ?? t.isin} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                  <td className="px-3 py-2">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{t.series}</span>
                    <div className="text-xs text-zinc-400">{t.isin}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(t.issuePrice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.redemptionPrice != null ? formatINR(t.redemptionPrice) : "—"}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${pctClass(ret)}`}>{ret == null ? "—" : `+${ret.toFixed(0)}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-zinc-400">Price return excludes the 2.5% coupons and taxes. Matured tranches no longer trade.</p>
    </section>
  );
}
