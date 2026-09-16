"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import {
  formatINR, istTime, premiumVsInav, premiumVsNav, spreadPct, pctClass,
} from "../lib/format";
import { useDashboard } from "../lib/useData";

const metalRefsQuery = makeFunctionReference<"query", Record<string, never>, any>("metalRefs:latestMetalRefs") as any;
const hasBackend = !!process.env.NEXT_PUBLIC_CONVEX_URL;

function McxStrip() {
  if (!hasBackend) return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const refs = useQuery(metalRefsQuery, {});
  if (!refs || (!refs.gold && !refs.silver)) return null;
  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {refs.gold ? (
        <div className="flex items-baseline gap-2.5 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-yellow-50/50 px-4 py-2.5 shadow-sm dark:border-amber-900/40 dark:from-amber-950/40 dark:to-yellow-950/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">MCX Gold</span>
          <span className="font-mono text-lg font-semibold tabular tracking-tight text-zinc-900 dark:text-zinc-50">{formatINR(refs.gold.pricePerGram)}<span className="text-xs font-normal text-zinc-500">/g</span></span>
          <span className="text-[10px] text-zinc-400">{refs.gold.symbol} · {istTime(refs.gold.sourceTs)}</span>
        </div>
      ) : null}
      {refs.silver ? (
        <div className="flex items-baseline gap-2.5 rounded-xl border border-zinc-300/70 bg-gradient-to-br from-zinc-100 to-zinc-50 px-4 py-2.5 shadow-sm dark:border-zinc-700/60 dark:from-zinc-900 dark:to-zinc-900/50">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">MCX Silver</span>
          <span className="font-mono text-lg font-semibold tabular tracking-tight text-zinc-900 dark:text-zinc-50">{formatINR(refs.silver.pricePerGram)}<span className="text-xs font-normal text-zinc-500">/g</span></span>
          <span className="text-[10px] text-zinc-400">{refs.silver.symbol} · {istTime(refs.silver.sourceTs)}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const rows = useDashboard();

  if (rows === undefined) {
    return <p className="py-20 text-center text-sm text-zinc-500">Loading ETFs…</p>;
  }
  if (rows === null) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        <p>Backend not connected yet.</p>
        <p className="mt-2 text-xs">Set NEXT_PUBLIC_CONVEX_URL and seed the universe to load live data.</p>
      </div>
    );
  }

  const isSgb = (r: any) => r.etf.kind === "sgb";
  const gold = rows.filter((r: any) => !isSgb(r) && r.etf.metal === "gold");
  const silver = rows.filter((r: any) => !isSgb(r) && r.etf.metal === "silver");
  const sgb = rows.filter(isSgb);

  return (
    <div className="space-y-8">
      <MarketNote />
      <McxStrip />
      <Section title="Gold ETFs" rows={gold} />
      <Section title="Silver ETFs" rows={silver} />
      {sgb.length > 0 && <Section title="Sovereign Gold Bonds" rows={sgb} />}
    </div>
  );
}

function MarketNote() {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/60 px-4 py-3 text-[12px] leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
      <span className="font-medium text-zinc-800 dark:text-zinc-200">Delayed data.</span> Premium vs iNAV shows only
      during market hours with fresh data; otherwise you see the value's own "as of" time and no percentage.
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: any[] }) {
  const accent = title.includes("Gold")
    ? "text-amber-600 dark:text-amber-400"
    : title.includes("Silver")
    ? "text-zinc-500 dark:text-zinc-400"
    : "text-emerald-600 dark:text-emerald-400";
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className={`text-[13px] font-semibold uppercase tracking-wider ${accent}`}>{title}</h2>
        <span className="text-xs font-normal text-zinc-400">({rows.length})</span>
        <div className="h-px flex-1 self-center bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-[65px] z-10">
            <tr className="border-b border-zinc-200 bg-zinc-50/95 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-400">
              <th className="px-4 py-2.5">ETF</th>
              <th className="px-3 py-2.5 text-right">Price</th>
              <th className="px-3 py-2.5 text-right">iNAV</th>
              <th className="px-3 py-2.5 text-right">NAV (EOD)</th>
              <th className="px-3 py-2.5 text-right">vs iNAV</th>
              <th className="px-3 py-2.5 text-right">vs NAV</th>
              <th className="px-3 py-2.5 text-right">Spread</th>
              <th className="px-4 py-2.5 text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <Row key={r.etf._id} r={r} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ r }: { r: any }) {
  const now = Date.now();
  const ltp = r.quote?.ltp ?? null;
  const inav = r.inav?.inav ?? null;
  const nav = r.nav?.nav ?? null;
  const pInav = premiumVsInav(ltp, inav, r.quote?.sourceTs, r.inav?.sourceTs, r.quote?.lastTradeTime, now);
  const pNav = premiumVsNav(ltp, nav, now);
  const spread = spreadPct(r.quote?.bidPrice, r.quote?.askPrice);
  const updated = r.quote?.sourceTs ?? r.nav?.navDateTs ?? null;

  return (
    <tr className="group border-b border-zinc-100 transition-colors last:border-0 hover:bg-amber-50/50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40">
      <td className="px-4 py-2.5">
        <Link href={`/etf/${r.etf.isin}`} className="font-semibold tracking-tight text-zinc-900 group-hover:text-amber-700 dark:text-zinc-100 dark:group-hover:text-amber-400">
          {r.etf.nseSymbol}
        </Link>
        <div className="max-w-[220px] truncate text-[11px] text-zinc-500 dark:text-zinc-400">{r.etf.schemeName}</div>
      </td>
      <td className="tabular px-3 py-2.5 text-right font-medium">{formatINR(ltp)}</td>
      <td className="tabular px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">{formatINR(inav)}</td>
      <td className="tabular px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">{formatINR(nav)}</td>
      <td className="px-3 py-2.5 text-right"><PremiumCell p={pInav} /></td>
      <td className="px-3 py-2.5 text-right"><PremiumCell p={pNav} /></td>
      <td className="tabular px-3 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
        {spread == null ? "—" : `${spread.toFixed(2)}%`}
      </td>
      <td className="px-4 py-2.5 text-right text-[11px] text-zinc-400">{updated ? istTime(updated) : "—"}</td>
    </tr>
  );
}

function PremiumCell({ p }: { p: { pct: number | null; suppressed: boolean; asOf?: string } }) {
  if (p.suppressed || p.pct == null) {
    return <span className="text-[11px] text-zinc-400">{p.asOf ? `as of ${p.asOf}` : "—"}</span>;
  }
  const pct = p.pct;
  const cls =
    pct > 0.15
      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
      : pct < -0.15
      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
  const arrow = pct > 0.15 ? "▲" : pct < -0.15 ? "▼" : "●";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular ${cls}`}>
      <span className="text-[9px]">{arrow}</span>
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}
