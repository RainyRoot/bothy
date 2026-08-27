// Handgezeichnetes Line-Icon-Set (kein Icon-Paket als neue Dependency).
// Einheitlich: 24x24 Viewbox, currentColor, strokeWidth 1.75, runde Kappen.

type IconProps = { className?: string };
export type IconComponent = (props: IconProps) => React.JSX.Element;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconHome({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

// Töpfe — ein Einmachglas mit Deckel, für Sparziele/Verbrauchstöpfe.
export function IconJar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 3.5h6" />
      <path d="M9.5 3.5v2.3c0 .4-.2.7-.5 1C7.6 8 7 9.6 7 11.2V18a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-6.8c0-1.6-.6-3.2-2-4.4-.3-.3-.5-.6-.5-1V3.5" />
      <path d="M7.3 13.5h9.4" />
    </svg>
  );
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16" />
      <path d="M8 3.5v3.5" />
      <path d="M16 3.5v3.5" />
      <path d="M8.5 14h.01" />
      <path d="M12 14h.01" />
      <path d="M15.5 14h.01" />
      <path d="M8.5 17h.01" />
      <path d="M12 17h.01" />
    </svg>
  );
}

// Essensplan — Gabel und Messer.
export function IconUtensils({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M8 3v6a1.5 1.5 0 0 1-3 0V3" />
      <path d="M6.5 3v18" />
      <path d="M6.5 9v0" />
      <path d="M16.5 3c-1.4 0-2.5 1.8-2.5 4s1.1 4 2.5 4" />
      <path d="M16.5 3v18" />
    </svg>
  );
}

// Einkaufsliste — Tragekorb.
export function IconCart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 8h14l-1.5 9.5a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 8Z" />
      <path d="M8 8V6.5A4 4 0 0 1 12 2.5a4 4 0 0 1 4 4V8" />
      <path d="M9.5 12v3.5" />
      <path d="M14.5 12v3.5" />
    </svg>
  );
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconLogOut({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
    </svg>
  );
}

// Umbuchen — zwei gegenläufige Pfeile.
export function IconSwap({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 8h13" />
      <path d="M14 4.5 17.5 8 14 11.5" />
      <path d="M20 16H7" />
      <path d="M10 12.5 6.5 16 10 19.5" />
    </svg>
  );
}

// Monatsstart — ein sich drehender Pfeil, "neuer Monat, gleicher Rhythmus".
export function IconRestart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 12a8 8 0 1 1 2.6 5.9" />
      <path d="M4 18v-5h5" />
    </svg>
  );
}

export function IconBell({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
