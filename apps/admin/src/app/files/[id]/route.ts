// Opens a store's private document (CAC certificate and the like) for the signed-in staff member.
// The file never has a public address; this passes the staff session to the API and streams it back.
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const res = await fetch(`${(process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "")}/admin/media/private/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) return new Response(res.status === 404 ? "Not found" : "Not allowed", { status: res.status });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
