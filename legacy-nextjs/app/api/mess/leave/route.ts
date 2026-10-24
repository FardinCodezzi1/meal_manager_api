import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';

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
      return errorResponse('You are not currently an active member of any mess', 400);
    }

    const updatedMembership = await prisma.messMember.update({
      where: { id: activeMembership.id },
      data: {
        status: 'LEFT',
        leftAt: new Date(),
      },
    });

    return jsonResponse({
      message: 'You have left the mess successfully. Historical records have been preserved.',
      membership: updatedMembership,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
