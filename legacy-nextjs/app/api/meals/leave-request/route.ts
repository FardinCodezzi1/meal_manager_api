import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';
import { toStartOfDayUTC } from '@/lib/date';

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
    const { startDate, endDate, reason } = body;

    if (!startDate || !endDate) {
      return errorResponse('startDate and endDate are required', 400);
    }

    const start = toStartOfDayUTC(startDate);
    const end = toStartOfDayUTC(endDate);

    if (start > end) {
      return errorResponse('startDate cannot be after endDate', 400);
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        memberId: activeMembership.id,
        startDate: start,
        endDate: end,
        reason: reason ? String(reason).trim() : null,
        status: 'PENDING',
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
        message: 'Leave request submitted successfully',
        leaveRequest,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
