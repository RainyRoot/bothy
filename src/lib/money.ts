const formatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function formatCent(cent: number): string {
  return formatter.format(cent / 100);
}

/** Parst eine Euro-Eingabe ("12,50" oder "12.50") in Cent. Wirft bei ungültiger Eingabe. */
export function parseEuroToCent(input: string): number {
  const normalized = input.trim().replace(",", ".");
  const euro = Number(normalized);
  if (!Number.isFinite(euro)) {
    throw new Error("Ungültiger Betrag");
  }
  return Math.round(euro * 100);
}
