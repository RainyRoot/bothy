import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./LogoutButton";
import { PushSetup } from "./PushSetup";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <p className="text-lg">Hallo, {user.name}.</p>
      <Link href="/toepfe" className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background">
        Töpfe
      </Link>
      <PushSetup />
      <LogoutButton />
    </main>
  );
}
