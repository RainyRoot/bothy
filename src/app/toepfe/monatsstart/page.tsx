import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { AppShell } from "../../AppShell";
import { MonatsstartForm } from "./MonatsstartForm";

export const dynamic = "force-dynamic";

export default async function MonatsstartPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <AppShell title="Monatsstart" back="/toepfe">
      <p className="-mt-2 text-sm text-muted">
        Beträge sind mit dem letzten Monatsstart vorausgefüllt — anpassen und bestätigen.
      </p>
      <MonatsstartForm />
    </AppShell>
  );
}
