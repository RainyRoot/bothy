import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getToepfeMitStand } from "@/lib/toepfe";
import { AppShell } from "../../AppShell";
import { UmbuchenForm } from "./UmbuchenForm";

export const dynamic = "force-dynamic";

export default async function UmbuchenPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const toepfe = await getToepfeMitStand();

  return (
    <AppShell title="Umbuchen" back="/toepfe">
      <UmbuchenForm toepfe={toepfe} />
    </AppShell>
  );
}
