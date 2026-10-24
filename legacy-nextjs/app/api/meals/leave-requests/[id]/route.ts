import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';
import { getDatesBetween, getMonthKeyFromDate } from '@/lib/date';

export async function OPTIONS() {
  return handleOptions();
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const activeMembership = await getUserActiveMembership(user.id);
    if (!activeMembership) {
      return errorResponse('You are not currently in an active mess', 400);
    }

    if (activeMembership.role !== 'MANAGER') {
      return errorResponse('Forbidden: Only mess managers can approve or reject leave requests', 403);
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        member: true,
      },
    });

    if (!leaveRequest || leaveRequest.member.messId !== activeMembership.messId) {
      return errorResponse('Leave request not found in your mess', 404);
    }

    const body = await req.json();
    const { status } = body;

    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      return errorResponse('Invalid status. Must be APPROVED or REJECTED', 400);
    }

    // Process update in transaction
    const updatedLeaveRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status },
      });

      if (status === 'APPROVED') {
        const dates = getDatesBetween(leaveRequest.startDate, leaveRequest.endDate);

        for (const date of dates) {
          const monthKey = getMonthKeyFromDate(date);

          // Find or create MessMonth
          let messMonth = await tx.messMonth.findUnique({
            where: {
              messId_monthKey: {
                messId: activeMembership.messId,
                monthKey,
              },
            },
          });

          if (!messMonth) {
            messMonth = await tx.messMonth.create({
              data: {
                messId: activeMembership.messId,
                monthKey,
                status: 'OPEN',
              },
            });
          }

          await tx.dailyMeal.upsert({
            where: {
              memberId_date: {
                memberId: leaveRequest.memberId,
                date,
              },
            },
            update: {
              lunch: 0,
              dinner: 0,
              isLeave: true,
              messMonthId: messMonth.id,
            },
            create: {
              messMonthId: messMonth.id,
              memberId: leaveRequest.memberId,
              date,
              lunch: 0,
              dinner: 0,
              isLeave: true,
            },
          });
        }
      }

      return updated;
    });

    return jsonResponse({
      message: `Leave request has been ${status.toLowerCase()}`,
      leaveRequest: updatedLeaveRequest,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
