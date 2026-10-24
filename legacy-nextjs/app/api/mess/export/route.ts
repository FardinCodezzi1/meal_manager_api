import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const activeMembership = await getUserActiveMembership(user.id);
    if (!activeMembership) {
      return errorResponse('You are not currently in an active mess', 400);
    }

    const { searchParams } = new URL(req.url);
    const monthKey = searchParams.get('monthKey');

    if (!monthKey) {
      return errorResponse('monthKey query parameter is required (e.g., ?monthKey=2026-10)', 400);
    }

    const messMonth = await prisma.messMonth.findUnique({
      where: {
        messId_monthKey: {
          messId: activeMembership.messId,
          monthKey,
        },
      },
      include: {
        mess: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
            managerId: true,
          },
        },
        bazarEntries: {
          include: {
            member: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        deposits: {
          include: {
            member: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        dailyMeals: {
          include: {
            member: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    if (!messMonth) {
      return errorResponse(`Month ${monthKey} not found for this mess`, 404);
    }

    const members = await prisma.messMember.findMany({
      where: { messId: activeMembership.messId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    const exportPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      mess: messMonth.mess,
      monthKey,
      members,
      bazarEntries: messMonth.bazarEntries,
      deposits: messMonth.deposits,
      dailyMeals: messMonth.dailyMeals,
    };

    return jsonResponse(exportPayload);
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
