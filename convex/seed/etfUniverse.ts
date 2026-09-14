/**
 * Verified Gold & Silver ETF universe — 18 gold + 11 silver ETFs.
 * Source: AMFI latest-nav (11-Sep-2026) + Upstox NSE/BSE instrument dumps (13-Sep-2026).
 * gramsPerUnit is a versioned estimate from issuer SIDs/product notes (see ETF-04 research);
 * it is used only to normalize to ₹/gram and must be re-verified after any corporate action.
 */

export type Metal = "gold" | "silver";

export interface EtfSeed {
  schemeName: string;
  amcName: string;
  metal: Metal;
  isin: string;
  nseSymbol: string;
  bseSymbol: string | null; // null = NSE-only
  upstoxKey: string; // NSE_EQ|<isin>
  gramsPerUnit: number;
  faceValueNote: string;
}

export const ETF_UNIVERSE: EtfSeed[] = [
  // ---- GOLD (18) ----
  { schemeName: "ANGEL ONE GOLD ETF", amcName: "Angel One Mutual Fund", metal: "gold", isin: "INF1J2R01114", nseSymbol: "AONEGOLD", bseSymbol: null, upstoxKey: "NSE_EQ|INF1J2R01114", gramsPerUnit: 0.001, faceValueNote: "NFO at ₹10 (Aug-2025)" },
  { schemeName: "Bandhan Gold ETF", amcName: "Bandhan Mutual Fund", metal: "gold", isin: "INF194KB1KJ7", nseSymbol: "GOLDBND", bseSymbol: "GOLDBND", upstoxKey: "NSE_EQ|INF194KB1KJ7", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit" },
  { schemeName: "Baroda BNP Paribas Gold ETF", amcName: "Baroda BNP Paribas Mutual Fund", metal: "gold", isin: "INF251K01SU9", nseSymbol: "BBNPPGOLD", bseSymbol: "BBNPPGOLD", upstoxKey: "NSE_EQ|INF251K01SU9", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit" },
  { schemeName: "Choice Gold ETF", amcName: "Choice Mutual Fund", metal: "gold", isin: "INF2KCX01012", nseSymbol: "CHOICEGOLD", bseSymbol: "CHOICEGOLD", upstoxKey: "NSE_EQ|INF2KCX01012", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit" },
  { schemeName: "Edelweiss Gold ETF", amcName: "Edelweiss Mutual Fund", metal: "gold", isin: "INF754K01SE6", nseSymbol: "EGOLD", bseSymbol: null, upstoxKey: "NSE_EQ|INF754K01SE6", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit" },
  { schemeName: "HDFC Gold ETF - Growth Option", amcName: "HDFC Mutual Fund", metal: "gold", isin: "INF179KC1981", nseSymbol: "HDFCGOLD", bseSymbol: "HDFCGOLD", upstoxKey: "NSE_EQ|INF179KC1981", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit (issuer FAQ)" },
  { schemeName: "HSBC Gold ETF", amcName: "HSBC Mutual Fund", metal: "gold", isin: "INF336L01RX2", nseSymbol: "HSBCGOLD", bseSymbol: "HSBCGOLD", upstoxKey: "NSE_EQ|INF336L01RX2", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit" },
  { schemeName: "ICICI Prudential Gold ETF", amcName: "ICICI Prudential Mutual Fund", metal: "gold", isin: "INF109KC1NT3", nseSymbol: "GOLDIETF", bseSymbol: "GOLDIETF", upstoxKey: "NSE_EQ|INF109KC1NT3", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit (splits 2016, 2018)" },
  { schemeName: "KOTAK GOLD ETF", amcName: "Kotak Mahindra Mutual Fund", metal: "gold", isin: "INF174KA1HJ8", nseSymbol: "GOLD1", bseSymbol: "GOLD1", upstoxKey: "NSE_EQ|INF174KA1HJ8", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit (Jul-2021 split, 1/100th g)" },
  { schemeName: "LIC MF Gold Exchange Traded Fund", amcName: "LIC Mutual Fund", metal: "gold", isin: "INF767K01SM1", nseSymbol: "LICMFGOLD", bseSymbol: "LICMFGOLD", upstoxKey: "NSE_EQ|INF767K01SM1", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit" },
  { schemeName: "Motilal Oswal Gold ETF", amcName: "Motilal Oswal Mutual Fund", metal: "gold", isin: "INF247L01FY4", nseSymbol: "MOGOLD", bseSymbol: "MOGOLD", upstoxKey: "NSE_EQ|INF247L01FY4", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit" },
  { schemeName: "Nippon India ETF Gold BeES", amcName: "Nippon India Mutual Fund", metal: "gold", isin: "INF204KB17I5", nseSymbol: "GOLDBEES", bseSymbol: "GOLDBEES", upstoxKey: "NSE_EQ|INF204KB17I5", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit (post 100:1 split Dec-2019)" },
  { schemeName: "Quantum Gold ETF", amcName: "Quantum Mutual Fund", metal: "gold", isin: "INF082J01408", nseSymbol: "QGOLDHALF", bseSymbol: "QGOLDHALF", upstoxKey: "NSE_EQ|INF082J01408", gramsPerUnit: 0.01, faceValueNote: "0.5 g → 0.01 g (Dec-2021); HALF is legacy" },
  { schemeName: "SBI Gold ETF", amcName: "SBI Mutual Fund", metal: "gold", isin: "INF200KA16D8", nseSymbol: "SETFGOLD", bseSymbol: "SETFGOLD", upstoxKey: "NSE_EQ|INF200KA16D8", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit (nominal)" },
  { schemeName: "Tata Gold Exchange Traded Fund", amcName: "Tata Mutual Fund", metal: "gold", isin: "INF277KA1976", nseSymbol: "TATAGOLD", bseSymbol: "TATAGOLD", upstoxKey: "NSE_EQ|INF277KA1976", gramsPerUnit: 0.001, faceValueNote: "NFO at ₹1 (Jan-2024)" },
  { schemeName: "The Wealth Company Gold ETF", amcName: "The Wealth Company Mutual Fund", metal: "gold", isin: "INF2F0001370", nseSymbol: "TWCGOLDETF", bseSymbol: "TWCGOLDETF", upstoxKey: "NSE_EQ|INF2F0001370", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit" },
  { schemeName: "Union Gold ETF", amcName: "Union Mutual Fund", metal: "gold", isin: "INF582M01KS4", nseSymbol: "UNIONGOLD", bseSymbol: "UNIONGOLD", upstoxKey: "NSE_EQ|INF582M01KS4", gramsPerUnit: 0.01, faceValueNote: "~0.01 g/unit" },
  { schemeName: "Zerodha Gold ETF", amcName: "Zerodha Mutual Fund", metal: "gold", isin: "INF0R8F01042", nseSymbol: "GOLDCASE", bseSymbol: "GOLDCASE", upstoxKey: "NSE_EQ|INF0R8F01042", gramsPerUnit: 0.0016, faceValueNote: "~0.0016 g/unit (630,000 units/kg)" },
  // ---- SILVER (11) ----
  { schemeName: "ANGEL ONE SILVER ETF", amcName: "Angel One Mutual Fund", metal: "silver", isin: "INF1J2R01171", nseSymbol: "AONESILVER", bseSymbol: null, upstoxKey: "NSE_EQ|INF1J2R01171", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit" },
  { schemeName: "Bandhan Silver ETF", amcName: "Bandhan Mutual Fund", metal: "silver", isin: "INF194KB1KI9", nseSymbol: "SILVERBND", bseSymbol: "SILVERBND", upstoxKey: "NSE_EQ|INF194KB1KI9", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit" },
  { schemeName: "Edelweiss Silver ETF", amcName: "Edelweiss Mutual Fund", metal: "silver", isin: "INF754K01SF3", nseSymbol: "ESILVER", bseSymbol: null, upstoxKey: "NSE_EQ|INF754K01SF3", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit" },
  { schemeName: "HDFC Silver ETF - Growth Option", amcName: "HDFC Mutual Fund", metal: "silver", isin: "INF179KC1DI2", nseSymbol: "HDFCSILVER", bseSymbol: "HDFCSILVER", upstoxKey: "NSE_EQ|INF179KC1DI2", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit" },
  { schemeName: "ICICI PRUDENTIAL SILVER ETF", amcName: "ICICI Prudential Mutual Fund", metal: "silver", isin: "INF109KC1Y56", nseSymbol: "SILVERIETF", bseSymbol: "SILVERIETF", upstoxKey: "NSE_EQ|INF109KC1Y56", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit" },
  { schemeName: "Kotak Silver ETF", amcName: "Kotak Mahindra Mutual Fund", metal: "silver", isin: "INF174KA1ZD3", nseSymbol: "SILVER1", bseSymbol: null, upstoxKey: "NSE_EQ|INF174KA1ZD3", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit" },
  { schemeName: "Motilal Oswal Silver ETF", amcName: "Motilal Oswal Mutual Fund", metal: "silver", isin: "INF247L01FZ1", nseSymbol: "MOSILVER", bseSymbol: "MOSILVER", upstoxKey: "NSE_EQ|INF247L01FZ1", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit" },
  { schemeName: "Nippon India Silver ETF", amcName: "Nippon India Mutual Fund", metal: "silver", isin: "INF204KC1402", nseSymbol: "SILVERBEES", bseSymbol: "SILVERBEES", upstoxKey: "NSE_EQ|INF204KC1402", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit" },
  { schemeName: "SBI Silver ETF", amcName: "SBI Mutual Fund", metal: "silver", isin: "INF200KB1217", nseSymbol: "SBISILVER", bseSymbol: "SBISILVER", upstoxKey: "NSE_EQ|INF200KB1217", gramsPerUnit: 1.0, faceValueNote: "~1 g/unit" },
  { schemeName: "Tata Silver Exchange Traded Fund", amcName: "Tata Mutual Fund", metal: "silver", isin: "INF277KA1984", nseSymbol: "TATSILV", bseSymbol: "TATSILV", upstoxKey: "NSE_EQ|INF277KA1984", gramsPerUnit: 0.1, faceValueNote: "~0.1 g/unit (SID: 1/10,000th of 1 kg)" },
  { schemeName: "Zerodha Silver ETF", amcName: "Zerodha Mutual Fund", metal: "silver", isin: "INF0R8F01091", nseSymbol: "SILVERCASE", bseSymbol: "SILVERCASE", upstoxKey: "NSE_EQ|INF0R8F01091", gramsPerUnit: 0.1, faceValueNote: "~0.1 g/unit" },
];

export const UPSTOX_KEYS = ETF_UNIVERSE.map((e) => e.upstoxKey);
export const NSE_SYMBOLS = ETF_UNIVERSE.map((e) => e.nseSymbol);
