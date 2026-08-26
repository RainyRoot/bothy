"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArchivButton({ topfId, archiviert }: { topfId: string; archiviert: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/toepfe/${topfId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiviert: !archiviert }),
      });
      router.push("/toepfe");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="self-start rounded border border-gray-300 px-3 py-2 text-sm text-gray-500 disabled:opacity-50 dark:border-gray-700"
    >
      {archiviert ? "Wiederherstellen" : "Archivieren"}
    </button>
  );
}
