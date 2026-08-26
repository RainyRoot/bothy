import { cookies } from "next/headers";
import { signValue, verifyValue } from "@/lib/signed-value";

export const SESSION_COOKIE_NAME = "bothy_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 Tage

export async function createSession(userId: string): Promise<void> {
  const value = await signValue({ userId }, SESSION_MAX_AGE_SECONDS);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifyValue<{ userId: string }>(value);
  return payload?.userId ?? null;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
