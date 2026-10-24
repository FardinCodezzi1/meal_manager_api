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

    const months = await prisma.messMonth.findMany({
      where: { messId: activeMembership.messId },
      orderBy: { monthKey: 'desc' },
    });

    return jsonResponse({
      messId: activeMembership.messId,
      months,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
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
    const { monthKey } = body;

    if (!monthKey || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
      return errorResponse('Invalid monthKey format. Expected format: YYYY-MM (e.g., 2026-10)', 400);
    }

    // Lock out future months (can only create current or previous months)
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (monthKey > currentMonthKey) {
      return errorResponse(`Cannot create future months. Max allowed month is current month (${currentMonthKey})`, 400);
    }

    const existingMonth = await prisma.messMonth.findUnique({
      where: {
        messId_monthKey: {
          messId: activeMembership.messId,
          monthKey,
        },
      },
    });

    if (existingMonth) {
      return errorResponse(`Month ${monthKey} already exists for this mess`, 400);
    }

    const newMonth = await prisma.messMonth.create({
      data: {
        messId: activeMembership.messId,
        monthKey,
        status: 'OPEN',
      },
    });

    return jsonResponse({
      message: `Month ${monthKey} created successfully`,
      month: newMonth,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
