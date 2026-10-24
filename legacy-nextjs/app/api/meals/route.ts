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
    });

    if (!messMonth) {
      return jsonResponse({
        monthKey,
        messId: activeMembership.messId,
        meals: [],
        groupedByDate: {},
      });
    }

    const meals = await prisma.dailyMeal.findMany({
      where: { messMonthId: messMonth.id },
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
      orderBy: [{ date: 'asc' }, { memberId: 'asc' }],
    });

    // Group meals by date (YYYY-MM-DD)
    const groupedByDate: Record<string, typeof meals> = {};
    for (const meal of meals) {
      const dateKey = meal.date.toISOString().split('T')[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(meal);
    }

    return jsonResponse({
      monthKey,
      messId: activeMembership.messId,
      messMonthId: messMonth.id,
      totalCount: meals.length,
      meals,
      groupedByDate,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
