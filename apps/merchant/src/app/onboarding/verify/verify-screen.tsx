"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ManualIdCheck } from "@sotechy/shared";
import { VerifyFlow } from "@/components/verify-flow";

export function VerifyScreen({ ownerName, previous }: { ownerName: string | null; previous: ManualIdCheck | null }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-canvas px-4 pb-10 pt-4 sm:px-6">
      <header className="mx-auto mb-5 flex max-w-3xl items-center justify-between">
        <span className="font-semibold">Verify your identity</span>
        <Link href="/onboarding?step=you" aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface">
          <X size={18} />
        </Link>
      </header>
      <VerifyFlow mode="dashboard" ownerName={ownerName} previous={previous} onDone={() => router.replace("/onboarding?verify=sent")} />
    </div>
  );
}
