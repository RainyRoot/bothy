export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startZusteller } = await import("@/lib/zusteller");
  startZusteller();
  const { startMaterialisiererLoop } = await import("@/lib/materialisierer-loop");
  startMaterialisiererLoop();
}
