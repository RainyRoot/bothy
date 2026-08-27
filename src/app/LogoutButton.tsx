"use client";

import { useRouter } from "next/navigation";
import { IconLogOut } from "./icons";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="icon-btn" aria-label="Abmelden" title="Abmelden">
      <IconLogOut className="h-5 w-5" />
    </button>
  );
}
