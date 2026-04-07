import { prisma } from "./prisma";
import { getServerSession } from "./server-session";

export async function logActivity(action: string, detail: string) {
  try {
    const session = await getServerSession();
    await prisma.activityLog.create({
      data: {
        action,
        detail,
        username: (session as any)?.username || "sistema",
        companyId: (session as any)?.companyId ?? null,
      },
    });
  } catch {
    // Non-critical — never block main operation
  }
}
