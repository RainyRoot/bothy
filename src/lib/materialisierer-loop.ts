import { materialisiereAlle } from "@/lib/reminder-materialize";
import { materialisiereAlleTodos } from "@/lib/todo-materialize";

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

function warteBisNaechste0300Uhr(): Promise<void> {
  const jetzt = new Date();
  const naechste = new Date(jetzt);
  naechste.setHours(3, 0, 0, 0);
  if (naechste <= jetzt) naechste.setDate(naechste.getDate() + 1);
  return new Promise((resolve) => setTimeout(resolve, naechste.getTime() - jetzt.getTime()));
}
