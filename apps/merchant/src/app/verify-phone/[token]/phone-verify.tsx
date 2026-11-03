"use client";

import { useState } from "react";
import { Illo } from "@/components/illustrations";
import { VerifyFlow } from "@/components/verify-flow";
import type { HandoffInfo } from "@/lib/id-check-actions";

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 pt-16 text-center">
      <Illo name="shield" size={72} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="text-ink-2">{body}</p>
    </div>
  );
}

export function PhoneVerify({ token, info, error }: { token: string; info: HandoffInfo | null; error: string | null }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen bg-canvas px-4 pb-10 pt-4">
      <header className="mx-auto mb-5 max-w-md">
        <p className="text-sm text-muted">{info ? info.storeName : "Sotechy"}</p>
        <p className="font-semibold">Verify your identity</p>
      </header>
      {sent ? (
        <Notice title="Submitted, under verification" body="All done on your phone. Your computer has moved on by itself. Most checks are done within 24 hours, and we'll email you as soon as you're verified." />
      ) : !info ? (
        <Notice title="This link doesn't work" body={error ?? "Scan the new code on your computer."} />
      ) : info.status === "in_review" || info.status === "approved" ? (
        <Notice title="Already sent" body="Your ID check has been sent. You can put your phone down." />
      ) : (
        <VerifyFlow mode="phone" token={token} ownerName={info.ownerName} previous={info.check} onDone={() => setSent(true)} />
      )}
    </div>
  );
}
