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

    const { searchParams } = new URL(req.url);
    const queryMessId = searchParams.get('messId');

    let messId = queryMessId;
    if (!messId) {
      const activeMembership = await getUserActiveMembership(user.id);
      if (!activeMembership) {
        return errorResponse('You are not currently in an active mess. Please specify messId or join a mess.', 400);
      }
      messId = activeMembership.messId;
    }

    const members = await prisma.messMember.findMany({
      where: { messId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { role: 'asc' },   // MANAGER first
        { joinedAt: 'asc' },
      ],
    });

    return jsonResponse({
      messId,
      members,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
