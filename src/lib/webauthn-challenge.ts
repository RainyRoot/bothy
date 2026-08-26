import { cookies } from "next/headers";
import { signValue, verifyValue } from "@/lib/signed-value";

const CHALLENGE_COOKIE_NAME = "bothy_webauthn_challenge";
const CHALLENGE_MAX_AGE_SECONDS = 60 * 5;

type PendingRegistration = { kind: "register"; challenge: string; name: string };
type PendingLogin = { kind: "login"; challenge: string };
type PendingChallenge = PendingRegistration | PendingLogin;

export async function setPendingChallenge(payload: PendingChallenge): Promise<void> {
  const store = await cookies();
  store.set(CHALLENGE_COOKIE_NAME, await signValue(payload, CHALLENGE_MAX_AGE_SECONDS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHALLENGE_MAX_AGE_SECONDS,
  });
}

export async function consumePendingChallenge(): Promise<PendingChallenge | null> {
  const store = await cookies();
  const value = store.get(CHALLENGE_COOKIE_NAME)?.value;
  store.delete(CHALLENGE_COOKIE_NAME);
  return await verifyValue<PendingChallenge>(value);
}
