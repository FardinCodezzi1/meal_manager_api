import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';

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
      return errorResponse('Forbidden: Only mess managers can approve or reject bazar entries', 403);
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

    const body = await req.json();
    const { status } = body;

    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      return errorResponse('Invalid status. Must be APPROVED or REJECTED', 400);
    }

    const updatedEntry = await prisma.bazarEntry.update({
      where: { id },
      data: { status },
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
      message: `Bazar entry has been ${status.toLowerCase()}`,
      entry: updatedEntry,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
