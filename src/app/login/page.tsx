import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const userCount = await prisma.user.count();
  if (userCount < 2) {
    redirect("/setup");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold">Bothy</h1>
        <LoginForm />
      </div>
    </main>
  );
}
