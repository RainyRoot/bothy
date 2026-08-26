export const RP_NAME = "Bothy";

/** Domain ohne Protokoll/Port. Lokal "localhost", produktiv DOMAIN aus .env (siehe PLAN.md 1/6). */
export function getRpId(): string {
  return process.env.DOMAIN || "localhost";
}

export function getOrigin(): string {
  const rpId = getRpId();
  if (rpId === "localhost") {
    return `http://localhost:${process.env.PORT ?? 3000}`;
  }
  return `https://${rpId}`;
}
