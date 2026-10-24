import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function PUT(
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
      return errorResponse('Forbidden: Only mess managers can update deposit records', 403);
    }

    const deposit = await prisma.deposit.findUnique({
      where: { id },
      include: {
        messMonth: true,
      },
    });

    if (!deposit || deposit.messMonth.messId !== activeMembership.messId) {
      return errorResponse('Deposit record not found in your mess', 404);
    }

    const body = await req.json();
    const { amount, date, notes, memberId } = body;

    const updateData: Record<string, unknown> = {};

    if (amount !== undefined) {
      const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return errorResponse('Amount must be a positive number', 400);
      }
      updateData.amount = parsedAmount;
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return errorResponse('Invalid date provided', 400);
      }
      updateData.date = parsedDate;
    }

    if (notes !== undefined) {
      updateData.notes = notes ? String(notes).trim() : null;
    }

    if (memberId !== undefined) {
      const member = await prisma.messMember.findUnique({ where: { id: memberId } });
      if (!member || member.messId !== activeMembership.messId) {
        return errorResponse('Invalid memberId in this mess', 400);
      }
      updateData.memberId = memberId;
    }

    const updatedDeposit = await prisma.deposit.update({
      where: { id },
      data: updateData,
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
      message: 'Deposit updated successfully',
      deposit: updatedDeposit,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function DELETE(
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
      return errorResponse('Forbidden: Only mess managers can delete deposit records', 403);
    }

    const deposit = await prisma.deposit.findUnique({
      where: { id },
      include: {
        messMonth: true,
      },
    });

    if (!deposit || deposit.messMonth.messId !== activeMembership.messId) {
      return errorResponse('Deposit record not found in your mess', 404);
    }

    await prisma.deposit.delete({
      where: { id },
    });

    return jsonResponse({
      message: 'Deposit record deleted successfully',
      id,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
