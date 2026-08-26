import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { getRpId, getOrigin } from "@/lib/webauthn";
import { consumePendingChallenge } from "@/lib/webauthn-challenge";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const response = body?.response as AuthenticationResponseJSON | undefined;
  if (!response) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const pending = await consumePendingChallenge();
  if (!pending || pending.kind !== "login") {
    return NextResponse.json({ error: "Anmeldung abgelaufen, bitte erneut versuchen" }, { status: 400 });
  }

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
  });
  if (!passkey) {
    return NextResponse.json({ error: "Unbekannter Passkey" }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports as AuthenticatorTransportFuture[],
      },
    });
  } catch {
    return NextResponse.json({ error: "Passkey konnte nicht verifiziert werden" }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey konnte nicht verifiziert werden" }, { status: 400 });
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
  });

  await createSession(passkey.userId);

  return NextResponse.json({ ok: true });
}
