import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNotificationPreferences } from "@/lib/notification-preferences";

/**
 * GET /api/portal/export-data
 * JSON download of the signed-in user's profile and related records (no secrets).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        select: {
          provider: true,
          type: true,
        },
      },
      casesAsClient: {
        select: {
          caseNumber: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      invoices: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          dueDate: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { passwordHash: _omit, ...safeUser } = user;
  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      ...safeUser,
      notificationPreferences: parseNotificationPreferences(user.notificationPreferences),
    },
  };

  const body = JSON.stringify(payload, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="siamez-data-export.json"',
    },
  });
}
