import { materialisiereAlle } from "@/lib/reminder-materialize";
import { materialisiereAlleTodos } from "@/lib/todo-materialize";
import { berlinWallParts, berlinWallToUTC } from "@/lib/timezone";

let started = false;

export function startMaterialisiererLoop(): void {
  if (started) return;
  started = true;
  void loop();
}

async function loop() {
  // Einmal sofort beim Serverstart, danach täglich um 03:00 (siehe PLAN.md 4.1).
  await laufen();
  while (true) {
    await warteBisNaechste0300Uhr();
    await laufen();
  }
}

async function laufen() {
  try {
    await materialisiereAlle();
  } catch (err) {
    console.error("Materialisierer-Fehler:", err);
  }
  try {
    await materialisiereAlleTodos();
  } catch (err) {
    console.error("Todo-Materialisierer-Fehler:", err);
  }
}

/** 03:00 Berlin, nicht Serverzeit — der Container läuft in UTC. */
function warteBisNaechste0300Uhr(): Promise<void> {
  const jetzt = new Date();
  let naechste = berlinWallToUTC(berlinWallParts(jetzt).datum, "03:00");
  if (naechste <= jetzt) {
    naechste = berlinWallToUTC(berlinWallParts(new Date(jetzt.getTime() + 86_400_000)).datum, "03:00");
  }
  return new Promise((resolve) => setTimeout(resolve, naechste.getTime() - jetzt.getTime()));
}
