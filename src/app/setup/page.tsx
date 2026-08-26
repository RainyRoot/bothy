import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./SetupForm";

export default async function SetupPage() {
  const userCount = await prisma.user.count();
  if (userCount >= 2) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-xl font-semibold">Bothy einrichten</h1>
        <p className="mb-6 text-sm text-gray-500">
          {userCount === 0 ? "Erste Person" : "Zweite Person"} — Invite-Code und Name eingeben,
          danach Passkey auf diesem Gerät anlegen.
        </p>
        <SetupForm />
      </div>
    </main>
  );
}
