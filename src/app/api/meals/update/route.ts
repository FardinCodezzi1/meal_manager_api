import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';
import { toStartOfDayUTC, getMonthKeyFromDate } from '@/lib/date';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const activeMembership = await getUserActiveMembership(user.id);
    if (!activeMembership) {
      return errorResponse('You are not currently in an active mess', 400);
    }

    const body = await req.json();
    const { memberId, date, lunch, dinner, isLeave } = body;

    if (!memberId || !date) {
      return errorResponse('memberId and date are required', 400);
    }

    // Role check: Members can only update their own meals unless they are MANAGER
    if (activeMembership.role !== 'MANAGER' && activeMembership.id !== memberId) {
      return errorResponse('Forbidden: You can only update your own meal records', 403);
    }

    // Verify target member belongs to the same mess
    const targetMember = await prisma.messMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.messId !== activeMembership.messId) {
      return errorResponse('Target member does not exist in your mess', 404);
    }

    const utcDate = toStartOfDayUTC(date);
    const monthKey = getMonthKeyFromDate(utcDate);

    // Find or create MessMonth
    let messMonth = await prisma.messMonth.findUnique({
      where: {
        messId_monthKey: {
          messId: activeMembership.messId,
          monthKey,
        },
      },
    });

    if (!messMonth) {
      messMonth = await prisma.messMonth.create({
        data: {
          messId: activeMembership.messId,
          monthKey,
          status: 'OPEN',
        },
      });
    }

    const lunchVal = typeof lunch === 'number' ? lunch : 1.0;
    const dinnerVal = typeof dinner === 'number' ? dinner : 1.0;
    const isLeaveVal = typeof isLeave === 'boolean' ? isLeave : false;

    // Upsert DailyMeal (idempotent by @@unique([memberId, date]))
    const dailyMeal = await prisma.dailyMeal.upsert({
      where: {
        memberId_date: {
          memberId,
          date: utcDate,
        },
      },
      update: {
        lunch: lunchVal,
        dinner: dinnerVal,
        isLeave: isLeaveVal,
        messMonthId: messMonth.id,
      },
      create: {
        messMonthId: messMonth.id,
        memberId,
        date: utcDate,
        lunch: lunchVal,
        dinner: dinnerVal,
        isLeave: isLeaveVal,
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return jsonResponse({
      message: 'Daily meal record updated successfully',
      meal: dailyMeal,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
