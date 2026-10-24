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

    const entry = await prisma.bazarEntry.findUnique({
      where: { id },
      include: {
        messMonth: true,
      },
    });

    if (!entry || entry.messMonth.messId !== activeMembership.messId) {
      return errorResponse('Bazar entry not found in your mess', 404);
    }

    // Role check: Manager can edit any; Member can edit only their own PENDING or DRAFT entries
    const isManager = activeMembership.role === 'MANAGER';
    const isOwner = entry.memberId === activeMembership.id;

    if (!isManager && (!isOwner || (entry.status !== 'PENDING' && entry.status !== 'DRAFT'))) {
      return errorResponse('Forbidden: You can only edit your own pending or draft bazar entries', 403);
    }

    const body = await req.json();
    const { amount, category, date, mode, items, notes, status } = body;

    const updateData: Record<string, unknown> = {};

    if (amount !== undefined) {
      const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return errorResponse('Amount must be a positive number', 400);
      }
      updateData.amount = parsedAmount;
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || !category.trim()) {
        return errorResponse('Category cannot be empty', 400);
      }
      updateData.category = category.trim();
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return errorResponse('Invalid date provided', 400);
      }
      updateData.date = parsedDate;
    }

    if (mode !== undefined) {
      updateData.mode = mode === 'CHECKLIST' ? 'CHECKLIST' : 'QUICK';
    }

    if (items !== undefined) {
      updateData.items = items;
    }

    if (notes !== undefined) {
      updateData.notes = notes ? String(notes).trim() : null;
    }

    // If manager supplies status change
    if (status !== undefined && isManager) {
      if (['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        updateData.status = status;
      }
    }

    const updatedEntry = await prisma.bazarEntry.update({
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
      message: 'Bazar entry updated successfully',
      entry: updatedEntry,
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

    const entry = await prisma.bazarEntry.findUnique({
      where: { id },
      include: {
        messMonth: true,
      },
    });

    if (!entry || entry.messMonth.messId !== activeMembership.messId) {
      return errorResponse('Bazar entry not found in your mess', 404);
    }

    const isManager = activeMembership.role === 'MANAGER';
    const isOwner = entry.memberId === activeMembership.id;

    if (!isManager && (!isOwner || (entry.status !== 'PENDING' && entry.status !== 'DRAFT'))) {
      return errorResponse('Forbidden: You can only delete your own pending or draft bazar entries', 403);
    }

    await prisma.bazarEntry.delete({
      where: { id },
    });

    return jsonResponse({
      message: 'Bazar entry deleted successfully',
      id,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
