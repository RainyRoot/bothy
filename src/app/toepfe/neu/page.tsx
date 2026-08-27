import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { AppShell } from "../../AppShell";
import { NeuerTopfForm } from "./NeuerTopfForm";

export const dynamic = "force-dynamic";

export default async function NeuerTopfPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <AppShell title="Neuer Topf" back="/toepfe">
      <NeuerTopfForm />
    </AppShell>
  );
}
