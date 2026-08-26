// Nutzt die Web Crypto API (statt node:crypto), damit dieselbe Signierung
// sowohl in Route Handlern als auch in der Edge-Middleware funktioniert.

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET fehlt (.env)");
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

async function sign(encoded: string): Promise<string> {
  const key = await getKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return toBase64Url(signature);
}

/** Signiert ein JSON-serialisierbares Payload mit Ablaufzeit. Nicht verschlüsselt, nur manipulationssicher. */
export async function signValue<T>(payload: T, maxAgeSeconds: number): Promise<string> {
  const encoded = Buffer.from(
    JSON.stringify({ payload, exp: Date.now() + maxAgeSeconds * 1000 }),
  ).toString("base64url");
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifyValue<T>(value: string | undefined | null): Promise<T | null> {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;

  const key = await getKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    Buffer.from(signature, "base64url"),
    new TextEncoder().encode(encoded),
  );
  if (!valid) return null;

  try {
    const { payload, exp } = JSON.parse(Buffer.from(encoded, "base64url").toString()) as {
      payload: T;
      exp: number;
    };
    if (typeof exp !== "number" || Date.now() > exp) return null;
    return payload;
  } catch {
    return null;
  }
}
