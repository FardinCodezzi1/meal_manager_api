import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'MESS-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
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
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        months: {
          orderBy: { monthKey: 'desc' },
        },
      },
    });

    if (!mess) {
      return errorResponse('Mess not found', 404);
    }

    return jsonResponse({
      mess,
      currentRole: activeMembership.role,
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

    if (activeMembership.role !== 'MANAGER') {
      return errorResponse('Forbidden: Only the mess manager can update mess settings', 403);
    }

    const body = await req.json();
    const { name, newManagerMemberId, regenerateInviteCode } = body;

    const messId = activeMembership.messId;
    let newInviteCode: string | undefined;

    if (regenerateInviteCode) {
      let unique = false;
      while (!unique) {
        newInviteCode = generateInviteCode();
        const existing = await prisma.mess.findUnique({ where: { inviteCode: newInviteCode } });
        if (!existing) unique = true;
      }
    }

    const updatedMess = await prisma.$transaction(async (tx) => {
      // 1. Transfer manager role if requested
      if (newManagerMemberId) {
        if (newManagerMemberId === activeMembership.id) {
          throw new Error('You are already the manager of this mess');
        }

        const targetMember = await tx.messMember.findUnique({
          where: { id: newManagerMemberId },
        });

        if (!targetMember || targetMember.messId !== messId || targetMember.status !== 'ACTIVE') {
          throw new Error('Target user is not an active member of this mess');
        }

        // Demote current manager to member
        await tx.messMember.update({
          where: { id: activeMembership.id },
          data: { role: 'MEMBER' },
        });

        // Promote new manager
        await tx.messMember.update({
          where: { id: newManagerMemberId },
          data: { role: 'MANAGER' },
        });

        // Update mess managerId
        await tx.mess.update({
          where: { id: messId },
          data: { managerId: targetMember.userId },
        });
      }

      // 2. Update mess name or invite code
      const updatePayload: Record<string, unknown> = {};
      if (name && typeof name === 'string' && name.trim()) {
        updatePayload.name = name.trim();
      }
      if (newInviteCode) {
        updatePayload.inviteCode = newInviteCode;
      }

      if (Object.keys(updatePayload).length > 0) {
        return tx.mess.update({
          where: { id: messId },
          data: updatePayload,
        });
      }

      return tx.mess.findUnique({ where: { id: messId } });
    });

    return jsonResponse({
      message: 'Mess updated successfully',
      mess: updatedMess,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 400);
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const activeMembership = await getUserActiveMembership(user.id);
    if (!activeMembership) {
      return errorResponse('You are not currently in an active mess', 400);
    }

    if (activeMembership.role !== 'MANAGER') {
      return errorResponse('Forbidden: Only the mess manager can delete the mess', 403);
    }

    const body = await req.json().catch(() => ({}));
    const { password, force } = body;

    if (!password) {
      return errorResponse('Manager password confirmation is required to close the mess', 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse('Invalid manager password. Mess closure aborted.', 401);
    }

    // Check if other active members exist
    const otherActiveMembers = await prisma.messMember.findMany({
      where: {
        messId: activeMembership.messId,
        status: 'ACTIVE',
        userId: { not: user.id },
      },
    });

    if (otherActiveMembers.length > 0 && !force) {
      return errorResponse(
        `Cannot delete mess: There are still ${otherActiveMembers.length} other active member(s) in this mess. All other members must leave the mess first, or you must transfer the manager role before deleting.`,
        400
      );
    }

    // Delete mess (cascades to all messMonths, bazarEntries, deposits, dailyMeals, and messMembers)
    await prisma.mess.delete({
      where: { id: activeMembership.messId },
    });

    return jsonResponse({
      message: 'Mess closed and deleted successfully. All members have been released, and you are now free to create or join another mess.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
