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

export async function POST(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const activeMembership = await getUserActiveMembership(user.id);
    if (activeMembership) {
      return errorResponse('You already have an active mess membership. Leave your current mess before creating a new one.', 400);
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return errorResponse('Mess name is required', 400);
    }

    let inviteCode = generateInviteCode();
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existing = await prisma.mess.findUnique({ where: { inviteCode } });
      if (!existing) {
        isCodeUnique = true;
      } else {
        inviteCode = generateInviteCode();
      }
    }

    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const newMess = await prisma.$transaction(async (tx) => {
      const mess = await tx.mess.create({
        data: {
          name: name.trim(),
          inviteCode,
          managerId: user.id,
        },
      });

      const member = await tx.messMember.create({
        data: {
          userId: user.id,
          messId: mess.id,
          role: 'MANAGER',
          status: 'ACTIVE',
        },
      });

      const month = await tx.messMonth.create({
        data: {
          messId: mess.id,
          monthKey: currentMonthKey,
          status: 'OPEN',
        },
      });

      return { mess, member, month };
    });

    return jsonResponse(
      {
        message: 'Mess created successfully',
        mess: newMess.mess,
        membership: newMess.member,
        currentMonth: newMess.month,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
