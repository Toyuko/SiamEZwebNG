import { getSession } from "@/lib/auth";
import { PublicHeader } from "./PublicHeader";

export async function PublicHeaderWithAuth() {
  const session = await getSession();
  return <PublicHeader user={session?.user ?? null} />;
}
