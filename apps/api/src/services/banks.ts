// Nigerian banks with the NIBSS bank codes payout services use. The payout service's own list comes first;
// this one fills in when it's empty or can't be reached, so stores can always pick their bank.
import type { Bank } from "@sotechy/shared";

export const NIGERIAN_BANKS: Bank[] = [
  { code: "044", name: "Access Bank" },
  { code: "063", name: "Access Bank (Diamond)" },
  { code: "035A", name: "ALAT by Wema" },
  { code: "565", name: "Carbon" },
  { code: "023", name: "Citibank Nigeria" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "562", name: "Ekondo Microfinance Bank" },
  { code: "51318", name: "FairMoney Microfinance Bank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank (FCMB)" },
  { code: "00103", name: "Globus Bank" },
  { code: "100022", name: "GoMoney" },
  { code: "058", name: "Guaranty Trust Bank (GTBank)" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "50211", name: "Kuda Bank" },
  { code: "303", name: "Lotus Bank" },
  { code: "50515", name: "Moniepoint Microfinance Bank" },
  { code: "999992", name: "OPay" },
  { code: "107", name: "Optimus Bank" },
  { code: "327", name: "Paga" },
  { code: "999991", name: "PalmPay" },
  { code: "104", name: "Parallex Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "105", name: "PremiumTrust Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "125", name: "Rubies Microfinance Bank" },
  { code: "106", name: "Signature Bank" },
  { code: "51310", name: "Sparkle Microfinance Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "SunTrust Bank" },
  { code: "302", name: "TAJ Bank" },
  { code: "102", name: "Titan Trust Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "215", name: "Unity Bank" },
  { code: "566", name: "VFD Microfinance Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

/** Reads a bank list whatever its shape ({ items }, { data }, { banks } or a plain array) */
export function readBanks(json: unknown): Bank[] {
  const j = json as Record<string, unknown> | unknown[] | null;
  const rows = (Array.isArray(j) ? j : ((j?.items ?? j?.data ?? j?.banks ?? []) as unknown[])) as Record<string, unknown>[];
  const seen = new Set<string>();
  return rows
    .map((b) => ({ code: String(b.code ?? b.bank_code ?? b.nip_code ?? b.cbn_code ?? b.id ?? ""), name: String(b.name ?? b.bank_name ?? b.display_name ?? "").trim() }))
    .filter((b) => b.code && b.name && !seen.has(b.code) && !!seen.add(b.code))
    .sort((a, b) => a.name.localeCompare(b.name));
}
