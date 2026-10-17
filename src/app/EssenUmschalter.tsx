import Link from "next/link";

/**
 * Essensplan und Einkaufsliste teilen sich einen Bottom-Nav-Tab (sechs Tabs
 * waren zu eng) — dieser Umschalter wechselt oben auf der Seite zwischen beiden.
 */
export function EssenUmschalter({ aktiv, woche }: { aktiv: "plan" | "liste"; woche: string }) {
  const segment = (istAktiv: boolean) =>
    `flex-1 rounded-lg py-1.5 text-center text-sm font-medium transition-colors duration-150 ${
      istAktiv ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
    }`;
  return (
    <div className="flex gap-1 rounded-xl bg-surface-hover p-1">
      <Link href={`/essensplan?woche=${woche}`} className={segment(aktiv === "plan")} aria-current={aktiv === "plan" ? "page" : undefined}>
        Wochenplan
      </Link>
      <Link href={`/einkaufsliste?woche=${woche}`} className={segment(aktiv === "liste")} aria-current={aktiv === "liste" ? "page" : undefined}>
        Einkaufsliste
      </Link>
    </div>
  );
}
