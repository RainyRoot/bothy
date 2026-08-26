import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getRpId } from "@/lib/webauthn";
import { setPendingChallenge } from "@/lib/webauthn-challenge";

export async function POST() {
  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: "preferred",
  });

  await setPendingChallenge({ kind: "login", challenge: options.challenge });

  return NextResponse.json(options);
}
