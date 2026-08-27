import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { IconChevronLeft } from "./icons";

/**
 * Gemeinsame Hülle für alle eingeloggten Seiten außer der Startseite (die hat
 * ihren eigenen Hero-Header): Titelzeile mit optionalem Zurück-Chevron und
 * Bottom-Nav am unteren Rand, erreichbar mit dem Daumen.
 */
export function AppShell({
  title,
  back,
  action,
  children,
}: {
  title: string;
  back?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-background/85 px-3 py-2.5 backdrop-blur-md">
        {back ? (
          <Link href={back} className="icon-btn -ml-1" aria-label="Zurück">
            <IconChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <div className="w-2" />
        )}
        <h1 className="flex-1 truncate px-1 text-[17px] font-semibold tracking-tight">{title}</h1>
        {action}
      </header>
      <main className="page">{children}</main>
      <BottomNav />
    </div>
  );
}
