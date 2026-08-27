import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const userCount = await prisma.user.count();
  if (userCount < 2) {
    redirect("/setup");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8 text-foreground">
      <div className="flex flex-col items-center gap-2">
        <BothyMark />
        <h1 className="text-xl font-semibold tracking-tight">Bothy</h1>
      </div>
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}

function BothyMark() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#17130f]">
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="#f2e9df" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 11.5 12 5l7 6.5" />
        <path d="M7 10.5v6.5a.75.75 0 0 0 .75.75h8.5a.75.75 0 0 0 .75-.75v-6.5" />
        <rect x="10.5" y="13.5" width="3" height="3" rx="0.5" fill="#f3703b" stroke="none" />
      </svg>
    </div>
  );
}
