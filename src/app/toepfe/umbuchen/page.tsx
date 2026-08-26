import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getToepfeMitStand } from "@/lib/toepfe";
import { UmbuchenForm } from "./UmbuchenForm";

export const dynamic = "force-dynamic";

export default async function UmbuchenPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const toepfe = await getToepfeMitStand();

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Umbuchen</h1>
      <UmbuchenForm toepfe={toepfe} />
    </main>
  );
}
