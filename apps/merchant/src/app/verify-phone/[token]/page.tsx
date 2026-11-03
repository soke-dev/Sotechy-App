// Opened on the owner's phone from the QR code on their computer: the same ID check, without signing in.
// The one-time link only works for 30 minutes and only for their own store.
import { loadHandoff } from "@/lib/id-check-actions";
import { PhoneVerify } from "./phone-verify";

export const metadata = { title: "Verify your identity · Sotechy" };

export default async function PhoneVerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await loadHandoff(token);
  return <PhoneVerify token={token} info={"ok" in r ? r.ok : null} error={"error" in r ? r.error : null} />;
}
