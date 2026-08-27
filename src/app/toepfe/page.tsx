import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getToepfeMitStand } from "@/lib/toepfe";
import { AppShell } from "../AppShell";
import { ToepfeListe } from "./ToepfeListe";
import { IconSwap, IconRestart, IconPlus } from "../icons";

export const dynamic = "force-dynamic";

export default async function ToepfePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const toepfe = await getToepfeMitStand();

  return (
    <AppShell title="Töpfe">
      <ToepfeListe initial={toepfe} />

      <div className="flex flex-wrap gap-2">
        <Link href="/toepfe/neu" className="chip inline-flex items-center gap-1.5">
          <IconPlus className="h-4 w-4" /> Neuer Topf
        </Link>
        <Link href="/toepfe/umbuchen" className="chip inline-flex items-center gap-1.5">
          <IconSwap className="h-4 w-4" /> Umbuchen
        </Link>
        <Link href="/toepfe/monatsstart" className="chip inline-flex items-center gap-1.5">
          <IconRestart className="h-4 w-4" /> Monatsstart
        </Link>
      </div>
    </AppShell>
  );
}
