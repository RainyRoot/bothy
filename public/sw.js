// Netzwerk-zuerst, Cache als Fallback: erlaubt Offline-Nutzung (z.B. Einkaufsliste
// im Supermarkt) für alles, was mindestens einmal online geladen wurde.
// Registriert wird mit ?v=<Build-ID> (siehe ServiceWorkerRegister): jeder
// Deploy installiert so einen neuen Worker, dessen activate die Caches des
// alten Builds samt ihrer veralteten _next/static-Chunks wegräumt.
const CACHE_NAME = `bothy-${new URL(self.location.href).searchParams.get("v") ?? "dev"}`;

// Schwaches Netz (Supermarkt) soll nicht jede Seite hängen lassen: nach dieser
// Zeit gilt der Request als gescheitert, und der Cache springt ein.
const NETZ_TIMEOUT_MS = 3000;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const namen = await caches.keys();
      await Promise.all(namen.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

function mitTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (wert) => {
        clearTimeout(timer);
        resolve(wert);
      },
      (fehler) => {
        clearTimeout(timer);
        reject(fehler);
      },
    );
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // API nie aus dem Cache: bei schwachem Netz käme sonst nach dem Timeout eine
  // alte Antwort, und das Polling (Töpfe, Einkaufsliste, Training) würde
  // frische Stände mit veralteten überschreiben. Offline decken die Outboxen ab.
  if (url.pathname.startsWith("/api/")) return;

  const netz = fetch(event.request).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)));
    }
    return response;
  });

  event.respondWith(
    mitTimeout(netz, NETZ_TIMEOUT_MS).catch(async () => {
      const treffer = await caches.match(event.request);
      if (treffer) return treffer;
      // Nichts im Cache: doch noch auf das langsame Netz warten statt sofort zu scheitern
      return netz.catch(() => Response.error());
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Bothy", body: event.data.text() };
  }

  const title = payload.title ?? "Bothy";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body,
      icon: "/icon-192.png",
      // Android zeigt vom Badge nur den Alphakanal — muss ein einfarbiges PNG sein
      badge: "/badge-96.png",
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      // client.url ist absolut, url relativ — nur den Pfad vergleichen
      const passend = clients.find((c) => new URL(c.url).pathname === url);
      if (passend && "focus" in passend) return passend.focus();

      // Sonst ein offenes Bothy-Fenster weiternutzen statt ein neues aufzumachen
      const irgendeins = clients.find((c) => "navigate" in c && "focus" in c);
      if (irgendeins) {
        await irgendeins.focus();
        return irgendeins.navigate(url);
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
