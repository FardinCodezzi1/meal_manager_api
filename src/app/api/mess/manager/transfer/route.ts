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
      return errorResponse('You are not currently in an active mess', 400);
    }

    const body = await req.json();
    const { targetMemberId, reason } = body;

    if (!targetMemberId || typeof targetMemberId !== 'string') {
      return errorResponse('targetMemberId is required', 400);
    }

    const mess = await prisma.mess.findUnique({
      where: { id: activeMembership.messId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
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

    if (!mess) {
      return errorResponse('Mess not found', 404);
    }

    const targetMember = mess.members.find((m) => m.id === targetMemberId);
    if (!targetMember) {
      return errorResponse('Target member not found or is not active in this mess', 404);
    }

    const previousManagerMember =
      mess.members.find((m) => m.role === 'MANAGER') ||
      mess.members.find((m) => m.userId === mess.managerId);

    if (previousManagerMember?.id === targetMember.id) {
      return errorResponse('Selected member is already the active manager of this mess', 400);
    }

    // Execute transfer in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Demote previous manager to MEMBER
      if (previousManagerMember) {
        await tx.messMember.update({
          where: { id: previousManagerMember.id },
          data: { role: 'MEMBER' },
        });
      }

      // 2. Promote target to MANAGER
      const updatedTarget = await tx.messMember.update({
        where: { id: targetMember.id },
        data: { role: 'MANAGER' },
      });

      // 3. Update Mess.managerId
      const updatedMess = await tx.mess.update({
        where: { id: mess.id },
        data: { managerId: targetMember.userId },
      });

      // 4. Create immutable ManagerAuditLog entry
      const auditLog = await tx.managerAuditLog.create({
        data: {
          messId: mess.id,
          changedById: user.id,
          action: 'MANUAL_OVERRIDE',
          previousManagerId: previousManagerMember?.id || null,
          newManagerId: targetMember.id,
          reason: reason?.trim() || `Manager role overridden by ${user.name}`,
        },
      });

      return {
        updatedMess,
        previousManager: previousManagerMember
          ? {
              id: previousManagerMember.id,
              name: previousManagerMember.user.name,
              email: previousManagerMember.user.email,
              role: 'MEMBER',
            }
          : null,
        newManager: {
          id: updatedTarget.id,
          name: targetMember.user.name,
          email: targetMember.user.email,
          role: 'MANAGER',
        },
        auditLog,
      };
    });

    return jsonResponse({
      message: `Manager role transferred to ${result.newManager.name} successfully`,
      transfer: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
