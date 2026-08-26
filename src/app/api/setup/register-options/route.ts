import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getRpId, RP_NAME } from "@/lib/webauthn";
import { setPendingChallenge } from "@/lib/webauthn-challenge";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode : "";

  if (!name || name.length > 50) {
    return NextResponse.json({ error: "Name fehlt oder ist zu lang" }, { status: 400 });
  }

  const expectedInviteCode = process.env.INVITE_CODE;
  if (!expectedInviteCode || inviteCode !== expectedInviteCode) {
    return NextResponse.json({ error: "Invite-Code falsch" }, { status: 401 });
  }

  const userCount = await prisma.user.count();
  if (userCount >= 2) {
    return NextResponse.json({ error: "Setup ist bereits abgeschlossen" }, { status: 403 });
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
    userName: name,
    userID: new Uint8Array(crypto.randomBytes(32)),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  await setPendingChallenge({ kind: "register", challenge: options.challenge, name });

  return NextResponse.json(options);
}
