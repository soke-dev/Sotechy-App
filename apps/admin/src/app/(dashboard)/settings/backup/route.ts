// Downloads a full backup of the database (every table, as JSON), through the signed-in admin's session
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/api";

export async function GET() {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const res = await fetch(`${(process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "")}/admin/reset/backup`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) return new Response(await res.text(), { status: res.status });
  return new Response(res.body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? 'attachment; filename="sotechy-backup.json"',
      "Cache-Control": "no-store",
    },
  });
}
