"use client";

import { useRouter } from "next/navigation";
import { IconLogOut } from "./icons";

export function LogoutButton({ mitText = false }: { mitText?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (mitText) {
    return (
      <button onClick={handleLogout} className="btn-secondary inline-flex items-center gap-2 self-start">
        <IconLogOut className="h-4 w-4" /> Abmelden
      </button>
    );
  }

  return (
    <button onClick={handleLogout} className="icon-btn" aria-label="Abmelden" title="Abmelden">
      <IconLogOut className="h-5 w-5" />
    </button>
  );
}
