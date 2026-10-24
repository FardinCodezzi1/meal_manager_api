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
    if (activeMembership) {
      return errorResponse('You already have an active mess membership. Leave your current mess before joining another.', 400);
    }

    const body = await req.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== 'string' || !inviteCode.trim()) {
      return errorResponse('Invite code is required', 400);
    }

    const mess = await prisma.mess.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });

    if (!mess) {
      return errorResponse('Invalid invite code: Mess not found', 404);
    }

    // Check if the user previously belonged to this mess
    const previousMembership = await prisma.messMember.findFirst({
      where: {
        userId: user.id,
        messId: mess.id,
      },
    });

    let member;
    if (previousMembership) {
      // Re-activate member
      member = await prisma.messMember.update({
        where: { id: previousMembership.id },
        data: {
          status: 'ACTIVE',
          leftAt: null,
          role: 'MEMBER',
        },
      });
    } else {
      member = await prisma.messMember.create({
        data: {
          userId: user.id,
          messId: mess.id,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      });
    }

    return jsonResponse({
      message: 'Joined mess successfully',
      mess,
      membership: member,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
