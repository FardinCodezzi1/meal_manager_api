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

    const activeMembership = await getUserActiveMembership(user.id);
    if (!activeMembership) {
      return errorResponse('You are not currently in an active mess', 400);
    }

    const months = await prisma.messMonth.findMany({
      where: { messId: activeMembership.messId },
      orderBy: { monthKey: 'desc' },
    });

    return jsonResponse({
      messId: activeMembership.messId,
      months,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
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
    const { monthKey } = body;

    if (!monthKey || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
      return errorResponse('Invalid monthKey format. Expected format: YYYY-MM (e.g., 2026-10)', 400);
    }

    // Lock out future months (can only create current or previous months)
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (monthKey > currentMonthKey) {
      return errorResponse(`Cannot create future months. Max allowed month is current month (${currentMonthKey})`, 400);
    }

    const existingMonth = await prisma.messMonth.findUnique({
      where: {
        messId_monthKey: {
          messId: activeMembership.messId,
          monthKey,
        },
      },
    });

    if (existingMonth) {
      return errorResponse(`Month ${monthKey} already exists for this mess`, 400);
    }

    // Create month and execute Automatic Monthly Manager Rotation if rotationType === 'MONTHLY'
    const result = await prisma.$transaction(async (tx) => {
      const newMonth = await tx.messMonth.create({
        data: {
          messId: activeMembership.messId,
          monthKey,
          status: 'OPEN',
        },
      });

      const mess = await tx.mess.findUnique({
        where: { id: activeMembership.messId },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
          managerSequences: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      let rotationDetails = null;

      if (mess && mess.rotationType === 'MONTHLY' && mess.members.length > 1) {
        const activeMembers = mess.members;
        const currentManagerMember =
          activeMembers.find((m) => m.role === 'MANAGER') ||
          activeMembers.find((m) => m.userId === mess.managerId);

        // Build or fetch valid sequence
        let validSequence = mess.managerSequences.filter((s) =>
          activeMembers.some((m) => m.id === s.memberId)
        );

        if (validSequence.length === 0) {
          // Default sequence based on current manager first, then others
          const defaultOrder = [
            currentManagerMember,
            ...activeMembers.filter((m) => m.id !== currentManagerMember?.id),
          ].filter(Boolean);

          validSequence = defaultOrder.map((m, i) => ({
            id: `temp-${i}`,
            messId: mess.id,
            memberId: m!.id,
            orderIndex: i,
            updatedAt: new Date(),
          }));
        }

        // Determine current manager's position in sequence
        const currentIdx = validSequence.findIndex(
          (s) => s.memberId === currentManagerMember?.id
        );

        const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % validSequence.length : 0;
        const nextMemberId = validSequence[nextIdx].memberId;
        const nextMember = activeMembers.find((m) => m.id === nextMemberId);

        if (nextMember && currentManagerMember && nextMember.id !== currentManagerMember.id) {
          // Demote previous manager
          await tx.messMember.update({
            where: { id: currentManagerMember.id },
            data: { role: 'MEMBER' },
          });

          // Promote next member in sequence
          await tx.messMember.update({
            where: { id: nextMember.id },
            data: { role: 'MANAGER' },
          });

          // Update Mess.managerId
          await tx.mess.update({
            where: { id: mess.id },
            data: { managerId: nextMember.userId },
          });

          // Log immutable audit entry
          const auditLog = await tx.managerAuditLog.create({
            data: {
              messId: mess.id,
              changedById: user.id,
              action: 'AUTOMATIC_MONTHLY_ROTATION',
              previousManagerId: currentManagerMember.id,
              newManagerId: nextMember.id,
              reason: `Automatic monthly manager rotation for new month ${monthKey}`,
            },
          });

          rotationDetails = {
            rotated: true,
            action: 'AUTOMATIC_MONTHLY_ROTATION',
            previousManager: {
              id: currentManagerMember.id,
              name: currentManagerMember.user.name,
              email: currentManagerMember.user.email,
            },
            newManager: {
              id: nextMember.id,
              name: nextMember.user.name,
              email: nextMember.user.email,
            },
            auditLogId: auditLog.id,
          };
        }
      }

      return {
        newMonth,
        rotation: rotationDetails,
      };
    });

    return jsonResponse({
      message: `Month ${monthKey} created successfully`,
      month: result.newMonth,
      managerRotation: result.rotation,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
