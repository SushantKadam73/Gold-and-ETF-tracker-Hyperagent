"use client";

import { useMemo, useState } from "react";
import { formatINR } from "../lib/format";

/**
 * ETF vs Physical cost calculator. Inputs stay in the browser — nothing is sent or stored.
 * Cost model sourced September 2026 (see research record on the Notion plan page).
 */
export default function CalculatorPage() {
  const [metal, setMetal] = useState<"gold" | "silver">("gold");
  const [amount, setAmount] = useState(100000);
  const [holdMonths, setHoldMonths] = useState(12);
  const [buyPremiumPct, setBuyPremiumPct] = useState(3); // physical buy premium over reference
  const [makingPct, setMakingPct] = useState(3); // coins/bars
  const [resalePct, setResalePct] = useState(95); // % of reference realized on sale
  const [lockerPerYear, setLockerPerYear] = useState(2360); // incl 18% GST, allocated
  const [taxSlabPct, setTaxSlabPct] = useState(30);
  const [priceChangePct, setPriceChangePct] = useState(0); // flat default

  const result = useMemo(() => compute({
    metal, amount, holdMonths, buyPremiumPct, makingPct, resalePct, lockerPerYear, taxSlabPct, priceChangePct,
  }), [metal, amount, holdMonths, buyPremiumPct, makingPct, resalePct, lockerPerYear, taxSlabPct, priceChangePct]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">ETF vs Physical — true cost of owning {metal}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Compares what you actually keep after buying, holding and selling. Inputs stay in your browser; nothing is stored.
          No return is guaranteed — the metal price change is an assumption you set.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Field label="Metal">
            <div className="flex gap-2">
              {(["gold", "silver"] as const).map((m) => (
                <button key={m} onClick={() => setMetal(m)}
                  className={`rounded-md px-3 py-1.5 text-sm capitalize ${metal === m ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"}`}>
                  {m}
                </button>
              ))}
            </div>
          </Field>
          <Num label="Investment amount (₹)" value={amount} onChange={setAmount} step={1000} />
          <Num label="Holding period (months)" value={holdMonths} onChange={setHoldMonths} step={1} />
          <Num label="Assumed metal price change (%)" value={priceChangePct} onChange={setPriceChangePct} step={0.5} />
          <Num label="Physical buy premium over reference (%)" value={buyPremiumPct} onChange={setBuyPremiumPct} step={0.5} />
          <Num label="Making charges (%)" value={makingPct} onChange={setMakingPct} step={0.5} />
          <Num label="Resale value (% of reference)" value={resalePct} onChange={setResalePct} step={0.5} />
          <Num label="Locker cost per year (₹, incl. GST)" value={lockerPerYear} onChange={setLockerPerYear} step={100} />
          <Num label="Your income-tax slab (%)" value={taxSlabPct} onChange={setTaxSlabPct} step={5} />
          <p className="text-xs text-zinc-400">
            Reference metal price: check the day's IBJA rate (linked) — we do not scrape it. GST 3% on physical purchase is a sunk cost.
          </p>
        </div>

        <div className="space-y-4">
          <RouteCard title="ETF" r={result.etf} accent />
          <RouteCard title="Physical (coin/bar)" r={result.physical} />
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">Physical costs more than ETF by</span>
              <span className="font-semibold tabular-nums">{result.deltaPct.toFixed(1)} percentage points</span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Round-trip cost at the stated assumptions: ETF ≈ {result.etf.costPct.toFixed(1)}%, physical ≈ {result.physical.costPct.toFixed(1)}%.
              The ETF expense ratio is already inside its returns (NAV is net of expenses) and is not added again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

function Num({ label, value, onChange, step }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <Field label={label}>
      <input
        type="number" value={value} step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-950"
      />
    </Field>
  );
}

interface RouteResult { netProceeds: number; totalCost: number; costPct: number; }

function RouteCard({ title, r, accent }: { title: string; r: RouteResult; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-zinc-900 bg-white dark:border-zinc-100 dark:bg-zinc-900" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
      <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{formatINR(r.netProceeds, 0)}</div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        net proceeds · total cost {formatINR(r.totalCost, 0)} ({r.costPct.toFixed(1)}%)
      </div>
    </div>
  );
}

/* ------------------------------ model ------------------------------ */

interface Inputs {
  metal: "gold" | "silver"; amount: number; holdMonths: number;
  buyPremiumPct: number; makingPct: number; resalePct: number;
  lockerPerYear: number; taxSlabPct: number; priceChangePct: number;
}

function compute(i: Inputs): { etf: RouteResult; physical: RouteResult; deltaPct: number } {
  const growth = 1 + i.priceChangePct / 100;

  // ETF route: stamp 0.015% buy, SEBI 0.0001%, tiny brokerage; TER inside NAV. Tax: 12m threshold, 12.5% LTCG no indexation.
  const etfBuyCostPct = 0.015 + 0.0001 + 0.05; // stamp + SEBI + ~brokerage
  const etfInvested = i.amount * (1 - etfBuyCostPct / 100);
  const etfValue = etfInvested * growth;
  const etfGain = etfValue - etfInvested;
  const etfTax = etfGain > 0 ? etfGain * (i.holdMonths > 12 ? 0.125 : i.taxSlabPct / 100) : 0;
  const etfNet = etfValue - etfTax;
  const etfTotalCost = i.amount - etfNet;

  // Physical route: 3% GST sunk, buy premium + making, resale % of reference, locker. Tax: 24m threshold, 12.5% LTCG.
  const physBuyMultiplier = (1 + i.buyPremiumPct / 100) * (1 + i.makingPct / 100) * 1.03;
  const metalBought = i.amount / physBuyMultiplier; // reference-value of metal acquired
  const lockerTotal = i.lockerPerYear * (i.holdMonths / 12);
  const physGross = metalBought * growth * (i.resalePct / 100);
  const physValue = physGross - lockerTotal;
  const physGain = physGross - metalBought; // taxable gain on metal value (locker is expense, not capital)
  const physTax = physGain > 0 ? physGain * (i.holdMonths > 24 ? 0.125 : i.taxSlabPct / 100) : 0;
  const physNet = physValue - physTax;
  const physTotalCost = i.amount - physNet;

  const etf: RouteResult = { netProceeds: etfNet, totalCost: etfTotalCost, costPct: (etfTotalCost / i.amount) * 100 };
  const physical: RouteResult = { netProceeds: physNet, totalCost: physTotalCost, costPct: (physTotalCost / i.amount) * 100 };
  return { etf, physical, deltaPct: physical.costPct - etf.costPct };
}
