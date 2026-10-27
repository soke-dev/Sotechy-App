// The people who run the store: the owner, and anyone invited with a role.
import { api, getStoreSession } from "@/lib/api";
import type { TeamMember } from "@/lib/market-actions";
import { TeamView } from "./team-view";

export default async function TeamPage() {
  const { role } = await getStoreSession();
  const team = await api.get<{ owner: { email: string; name: string | null; username: string | null } | null; members: TeamMember[] }>("/merchant/team");
  return <TeamView owner={team.owner} members={team.members} you={role} />;
}
