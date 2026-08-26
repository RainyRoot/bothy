import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { NeuerTopfForm } from "./NeuerTopfForm";

export const dynamic = "force-dynamic";

export default async function NeuerTopfPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Neuer Topf</h1>
      <NeuerTopfForm />
    </main>
  );
}
