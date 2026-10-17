import Link from "next/link";
import { ZuruecksetzenForm } from "./ZuruecksetzenForm";

export default function PasswortVergessenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Passwort zurücksetzen</h1>
        <p className="text-sm text-muted">
          Mit deinem Namen und dem Invite-Code vom Setup (steht in der .env auf dem Server) ein neues Passwort setzen.
        </p>
      </div>
      <div className="w-full max-w-sm">
        <ZuruecksetzenForm />
      </div>
      <Link href="/login" className="text-sm text-muted hover:text-foreground">
        Zurück zur Anmeldung
      </Link>
    </main>
  );
}
