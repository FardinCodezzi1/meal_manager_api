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
        entries: [],
        stats: {
          totalEntries: 0,
          approvedCount: 0,
          pendingCount: 0,
          rejectedCount: 0,
          totalApprovedAmount: 0,
        },
      });
    }

    const entries = await prisma.bazarEntry.findMany({
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

    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let totalApprovedAmount = 0;

    for (const item of entries) {
      if (item.status === 'APPROVED') {
        approvedCount++;
        totalApprovedAmount += item.amount;
      } else if (item.status === 'PENDING') {
        pendingCount++;
      } else if (item.status === 'REJECTED') {
        rejectedCount++;
      }
    }

    return jsonResponse({
      monthKey,
      messId: activeMembership.messId,
      messMonthId: messMonth.id,
      stats: {
        totalEntries: entries.length,
        approvedCount,
        pendingCount,
        rejectedCount,
        totalApprovedAmount,
      },
      entries,
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
    const { monthKey: reqMonthKey, amount, category, date, mode, items, notes } = body;

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return errorResponse('Amount must be a positive number', 400);
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return errorResponse('Category is required', 400);
    }

    const entryDate = date ? new Date(date) : new Date();
    if (isNaN(entryDate.getTime())) {
      return errorResponse('Invalid date provided', 400);
    }

    const monthKey = reqMonthKey || getMonthKeyFromDate(toStartOfDayUTC(entryDate));

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

    // Specification: If submitted by MANAGER -> APPROVED; if MEMBER -> PENDING
    const initialStatus = activeMembership.role === 'MANAGER' ? 'APPROVED' : 'PENDING';
    const bazarMode = mode === 'CHECKLIST' ? 'CHECKLIST' : 'QUICK';

    const entry = await prisma.bazarEntry.create({
      data: {
        messMonthId: messMonth.id,
        memberId: activeMembership.id,
        amount: parsedAmount,
        category: category.trim(),
        date: entryDate,
        status: initialStatus,
        mode: bazarMode,
        items: items ?? null,
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
        message: `Bazar entry created successfully with status ${initialStatus}`,
        entry,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
