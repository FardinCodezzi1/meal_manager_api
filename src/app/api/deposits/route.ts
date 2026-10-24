import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';
import { toStartOfDayUTC, getMonthKeyFromDate } from '@/lib/date';

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
        totalDeposit: 0,
        deposits: [],
      });
    }

    const deposits = await prisma.deposit.findMany({
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
      orderBy: { date: 'desc' },
    });

    const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);

    return jsonResponse({
      monthKey,
      messId: activeMembership.messId,
      messMonthId: messMonth.id,
      totalDeposit,
      deposits,
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

    if (activeMembership.role !== 'MANAGER') {
      return errorResponse('Forbidden: Only mess managers can record member deposits', 403);
    }

    const body = await req.json();
    const { monthKey: reqMonthKey, memberId, amount, date, notes } = body;

    if (!memberId) {
      return errorResponse('memberId is required', 400);
    }

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return errorResponse('Amount must be a positive number', 400);
    }

    // Verify member belongs to this mess
    const targetMember = await prisma.messMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.messId !== activeMembership.messId) {
      return errorResponse('Target member does not belong to your mess', 404);
    }

    const depositDate = date ? new Date(date) : new Date();
    if (isNaN(depositDate.getTime())) {
      return errorResponse('Invalid date provided', 400);
    }

    const monthKey = reqMonthKey || getMonthKeyFromDate(toStartOfDayUTC(depositDate));

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

    const deposit = await prisma.deposit.create({
      data: {
        messMonthId: messMonth.id,
        memberId,
        amount: parsedAmount,
        date: depositDate,
        notes: notes ? String(notes).trim() : null,
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

    return jsonResponse(
      {
        message: 'Deposit recorded successfully',
        deposit,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
