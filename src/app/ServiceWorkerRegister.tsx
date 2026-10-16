"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Neue Build-ID → neue Worker-URL → alter Cache wird beim activate verworfen
      const version = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
      navigator.serviceWorker.register(`/sw.js?v=${version}`).catch(() => {});
    }
  }, []);
  return null;
}
