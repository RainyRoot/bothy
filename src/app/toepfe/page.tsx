import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getToepfeMitStand } from "@/lib/toepfe";
import { ToepfeListe } from "./ToepfeListe";

export const dynamic = "force-dynamic";

export default async function ToepfePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const toepfe = await getToepfeMitStand();

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Töpfe</h1>
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          Zurück
        </Link>
      </div>

      <ToepfeListe initial={toepfe} />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/toepfe/neu"
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          + Neuer Topf
        </Link>
        <Link
          href="/toepfe/umbuchen"
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          Umbuchen
        </Link>
        <Link
          href="/toepfe/monatsstart"
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          Monatsstart
        </Link>
      </div>
    </main>
  );
}
