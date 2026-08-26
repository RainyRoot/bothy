import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { getRpId, getOrigin } from "@/lib/webauthn";
import { consumePendingChallenge } from "@/lib/webauthn-challenge";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const response = body?.response as RegistrationResponseJSON | undefined;
  if (!response) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const pending = await consumePendingChallenge();
  if (!pending || pending.kind !== "register") {
    return NextResponse.json(
      { error: "Registrierung abgelaufen, bitte erneut starten" },
      { status: 400 },
    );
  }

  const userCount = await prisma.user.count();
  if (userCount >= 2) {
    return NextResponse.json({ error: "Setup ist bereits abgeschlossen" }, { status: 403 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
    });
  } catch {
    return NextResponse.json({ error: "Passkey konnte nicht verifiziert werden" }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey konnte nicht verifiziert werden" }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const user = await prisma.user.create({
    data: {
      name: pending.name,
      passkeys: {
        create: {
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          transports: credential.transports ?? [],
        },
      },
    },
  });

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
