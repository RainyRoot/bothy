import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { MonatsstartForm } from "./MonatsstartForm";

export const dynamic = "force-dynamic";

export default async function MonatsstartPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Monatsstart</h1>
      <p className="text-sm text-gray-500">
        Beträge sind mit dem letzten Monatsstart vorausgefüllt — anpassen und bestätigen.
      </p>
      <MonatsstartForm />
    </main>
  );
}
