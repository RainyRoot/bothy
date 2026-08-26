import Link from "next/link";
import type { Ereignis } from "@/lib/kalender";
import { tagSchluessel } from "@/lib/kalender-shared";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function Monatsraster({
  jahr,
  monat,
  ereignisse,
}: {
  jahr: number;
  monat: number;
  ereignisse: Ereignis[];
}) {
  const ersterTag = new Date(Date.UTC(jahr, monat - 1, 1));
  const anzahlTage = new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
  const startOffset = (ersterTag.getUTCDay() + 6) % 7; // Montag = 0

  const ereignisseProTag = new Map<string, Ereignis[]>();
  for (const e of ereignisse) {
    const schluessel = tagSchluessel(e.datum);
    const liste = ereignisseProTag.get(schluessel) ?? [];
    liste.push(e);
    ereignisseProTag.set(schluessel, liste);
  }

  const zellen: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: anzahlTage }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-7 gap-1 text-xs">
      {WOCHENTAGE.map((w) => (
        <div key={w} className="text-center font-medium text-gray-500">
          {w}
        </div>
      ))}
      {zellen.map((tag, i) => {
        if (tag === null) return <div key={`leer-${i}`} />;
        const tagDatum = new Date(Date.UTC(jahr, monat - 1, tag));
        const tagEreignisse = ereignisseProTag.get(tagSchluessel(tagDatum)) ?? [];
        return (
          <div key={tag} className="flex min-h-14 flex-col gap-0.5 rounded border border-gray-200 p-1 dark:border-gray-800">
            <span className="text-gray-500">{tag}</span>
            {tagEreignisse.slice(0, 3).map((e, idx) => (
              <Link
                key={`${e.terminId}-${idx}`}
                href={`/kalender/${e.terminId}`}
                className="truncate rounded px-1 text-[10px] text-white"
                style={{ backgroundColor: e.farbe ?? "#6b7280" }}
                title={e.titel}
              >
                {e.titel}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
