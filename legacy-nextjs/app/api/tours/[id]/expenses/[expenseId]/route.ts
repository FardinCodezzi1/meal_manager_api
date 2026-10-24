import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string; expenseId: string }> }) {
  try {
    const params = await props.params;
    const { id: tourId, expenseId } = params;
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const isSuperAdmin = user.isSuperAdmin || user.email.toLowerCase() === 'fardin1.codezzi@gmail.com';

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        members: true,
      },
    });

    if (!tour) {
      return errorResponse('Tour not found', 404);
    }

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const canDelete = currentMember?.role === 'LEAD' || currentMember?.role === 'ACCOUNTANT' || isSuperAdmin;

    if (!canDelete) {
      return errorResponse('Forbidden: Only the Tour Lead, Accountant, or Super Admin can delete expenses', 403);
    }

    const expense = await prisma.tourExpense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.tourId !== tourId) {
      return errorResponse('Expense record not found', 404);
    }

    await prisma.tourExpense.delete({
      where: { id: expenseId },
    });

    return jsonResponse({
      message: 'Expense record deleted successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
