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
                phone: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        managerSequences: {
          orderBy: { orderIndex: 'asc' },
          include: {
            member: {
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
            },
          },
        },
      },
    });

    if (!mess) {
      return errorResponse('Mess not found', 404);
    }

    const activeMembers = mess.members;
    const activeMemberMap = new Map(activeMembers.map((m) => [m.id, m]));

    // Check if sequence needs initialization or synchronization
    let existingSequence = mess.managerSequences.filter((s) =>
      activeMemberMap.has(s.memberId)
    );

    if (existingSequence.length === 0) {
      // Initialize sequence: Current manager first, then others by joinedAt
      const currentManagerMember =
        activeMembers.find((m) => m.role === 'MANAGER') ||
        activeMembers.find((m) => m.userId === mess.managerId) ||
        activeMembers[0];

      const orderedMembers = [
        currentManagerMember,
        ...activeMembers.filter((m) => m.id !== currentManagerMember?.id),
      ].filter(Boolean);

      // Create sequence records
      await prisma.$transaction(
        orderedMembers.map((mem, index) =>
          prisma.managerSequence.upsert({
            where: {
              messId_memberId: {
                messId: mess.id,
                memberId: mem!.id,
              },
            },
            update: { orderIndex: index },
            create: {
              messId: mess.id,
              memberId: mem!.id,
              orderIndex: index,
            },
          })
        )
      );

      // Re-fetch sequence
      existingSequence = await prisma.managerSequence.findMany({
        where: { messId: mess.id },
        orderBy: { orderIndex: 'asc' },
        include: {
          member: {
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
          },
        },
      });
    } else {
      // Check if any active member is missing from sequence
      const sequencedMemberIds = new Set(existingSequence.map((s) => s.memberId));
      const missingMembers = activeMembers.filter((m) => !sequencedMemberIds.has(m.id));

      if (missingMembers.length > 0) {
        let maxOrder = existingSequence.reduce((max, s) => Math.max(max, s.orderIndex), -1);
        await prisma.$transaction(
          missingMembers.map((mem) => {
            maxOrder += 1;
            return prisma.managerSequence.create({
              data: {
                messId: mess.id,
                memberId: mem.id,
                orderIndex: maxOrder,
              },
            });
          })
        );

        // Re-fetch sequence
        existingSequence = await prisma.managerSequence.findMany({
          where: { messId: mess.id },
          orderBy: { orderIndex: 'asc' },
          include: {
            member: {
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
            },
          },
        });
      }
    }

    const currentManagerMember =
      activeMembers.find((m) => m.role === 'MANAGER') ||
      activeMembers.find((m) => m.userId === mess.managerId);

    const formattedSequence = existingSequence
      .filter((s) => s.member.status === 'ACTIVE')
      .map((s) => ({
        id: s.id,
        memberId: s.memberId,
        userId: s.member.userId,
        name: s.member.user.name,
        email: s.member.user.email,
        phone: s.member.user.phone,
        orderIndex: s.orderIndex,
        role: s.member.role,
        isCurrentManager: s.member.id === currentManagerMember?.id,
      }));

    return jsonResponse({
      messId: mess.id,
      rotationType: mess.rotationType,
      currentManagerId: mess.managerId,
      currentManagerMemberId: currentManagerMember?.id || null,
      currentManager: currentManagerMember
        ? {
            id: currentManagerMember.id,
            userId: currentManagerMember.userId,
            name: currentManagerMember.user.name,
            email: currentManagerMember.user.email,
          }
        : null,
      sequence: formattedSequence,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function PUT(req: Request) {
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
    const { memberIds, rotationType, reason } = body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return errorResponse('memberIds array is required', 400);
    }

    if (rotationType && !['MONTHLY', 'WEEKLY', 'MANUAL'].includes(rotationType)) {
      return errorResponse('Invalid rotationType. Allowed: MONTHLY, WEEKLY, MANUAL', 400);
    }

    // Verify all memberIds belong to active members of this mess
    const activeMembers = await prisma.messMember.findMany({
      where: {
        messId: activeMembership.messId,
        status: 'ACTIVE',
      },
    });

    const activeMemberIds = new Set(activeMembers.map((m) => m.id));
    for (const mId of memberIds) {
      if (!activeMemberIds.has(mId)) {
        return errorResponse(`Member ID ${mId} is not an active member of this mess`, 400);
      }
    }

    // Update sequence and audit log in a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update rotationType if specified
      if (rotationType) {
        await tx.mess.update({
          where: { id: activeMembership.messId },
          data: { rotationType },
        });
      }

      // 2. Delete existing sequences
      await tx.managerSequence.deleteMany({
        where: { messId: activeMembership.messId },
      });

      // 3. Create newly ordered sequences
      for (let i = 0; i < memberIds.length; i++) {
        await tx.managerSequence.create({
          data: {
            messId: activeMembership.messId,
            memberId: memberIds[i],
            orderIndex: i,
          },
        });
      }

      // 4. Create immutable ManagerAuditLog entry
      await tx.managerAuditLog.create({
        data: {
          messId: activeMembership.messId,
          changedById: user.id,
          action: 'SEQUENCE_REORDERED',
          previousManagerId: null,
          newManagerId: null,
          reason: reason?.trim() || `Manager rotation queue reordered by ${user.name}`,
        },
      });
    });

    return jsonResponse({
      message: 'Manager rotation queue reordered successfully',
      updatedCount: memberIds.length,
      rotationType: rotationType || activeMembership.mess.rotationType,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
