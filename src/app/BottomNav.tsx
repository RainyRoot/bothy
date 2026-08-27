"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconJar, IconCalendar, IconUtensils, IconCart } from "./icons";

const ITEMS = [
  { href: "/", label: "Start", Icon: IconHome, match: (p: string) => p === "/" },
  { href: "/toepfe", label: "Töpfe", Icon: IconJar, match: (p: string) => p.startsWith("/toepfe") },
  { href: "/kalender", label: "Kalender", Icon: IconCalendar, match: (p: string) => p.startsWith("/kalender") },
  { href: "/essensplan", label: "Essen", Icon: IconUtensils, match: (p: string) => p.startsWith("/essensplan") },
  { href: "/einkaufsliste", label: "Liste", Icon: IconCart, match: (p: string) => p.startsWith("/einkaufsliste") },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors duration-150 ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-8 w-9 items-center justify-center rounded-full transition-colors duration-150 ${
                  active ? "bg-accent-soft" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
