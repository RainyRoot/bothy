import Link from "next/link";
import type { Ereignis } from "@/lib/kalender";
import { formatBerlinDatum, formatBerlinZeit } from "@/lib/timezone";

export function Agenda({ ereignisse }: { ereignisse: Ereignis[] }) {
  if (ereignisse.length === 0) {
    return <p className="text-sm text-gray-500">Keine anstehenden Termine.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {ereignisse.map((e, idx) => (
        <li key={`${e.terminId}-${idx}`}>
          <Link
            href={`/kalender/${e.terminId}`}
            className="flex items-center gap-2 rounded border border-gray-200 p-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.farbe ?? "#6b7280" }} />
            <span className="w-24 shrink-0 text-gray-500">
              {formatBerlinDatum(e.datum)}
              {!e.ganztags && <> {formatBerlinZeit(e.datum)}</>}
            </span>
            <span className="truncate">{e.titel}</span>
            {e.ort && <span className="truncate text-gray-500">· {e.ort}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
