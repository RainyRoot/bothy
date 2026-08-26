import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NeuerTerminForm } from "./NeuerTerminForm";

export const dynamic = "force-dynamic";

export default async function NeuerTerminPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2, select: { name: true } });

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Neuer Termin</h1>
      <NeuerTerminForm partnerAName={users[0]?.name ?? "Person 1"} partnerBName={users[1]?.name ?? "Person 2"} />
    </main>
  );
}
