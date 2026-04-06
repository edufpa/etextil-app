import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";

export async function getServerSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session")?.value;
  return decrypt(raw);
}
