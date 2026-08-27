import Link from "next/link";
import type { Ereignis } from "@/lib/kalender";
import { formatBerlinDatum, formatBerlinZeit } from "@/lib/timezone";

export function Agenda({ ereignisse }: { ereignisse: Ereignis[] }) {
  if (ereignisse.length === 0) {
    return <p className="card text-center text-sm text-muted">Keine anstehenden Termine.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {ereignisse.map((e, idx) => (
        <li key={`${e.terminId}-${idx}`}>
          <Link href={`/kalender/${e.terminId}`} className="card flex items-center gap-3 !p-3 text-sm transition-colors duration-150 hover:bg-surface-hover">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.farbe ?? "#6b7280" }} />
            <span className="w-24 shrink-0 text-muted">
              {formatBerlinDatum(e.datum)}
              {!e.ganztags && <> {formatBerlinZeit(e.datum)}</>}
            </span>
            <span className="truncate font-medium">{e.titel}</span>
            {e.ort && <span className="truncate text-muted">· {e.ort}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
