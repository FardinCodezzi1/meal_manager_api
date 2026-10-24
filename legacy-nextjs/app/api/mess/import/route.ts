import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest, getUserActiveMembership } from '@/lib/auth';
import { toStartOfDayUTC } from '@/lib/date';

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

    if (activeMembership.role !== 'MANAGER') {
      return errorResponse('Forbidden: Only mess managers can import mess data', 403);
    }

    const body = await req.json();
    const { monthKey, bazarEntries, deposits, dailyMeals } = body;

    if (!monthKey || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
      return errorResponse('Valid monthKey (YYYY-MM) is required in the import payload', 400);
    }

    // Ensure MessMonth exists
    let messMonth = await prisma.messMonth.findUnique({
      where: {
        messId_monthKey: {
          messId: activeMembership.messId,
          monthKey,
        },
      },
    });

    if (!messMonth) {
      messMonth = await prisma.messMonth.create({
        data: {
          messId: activeMembership.messId,
          monthKey,
          status: 'OPEN',
        },
      });
    }

    // Get current members map by email or memberId
    const currentMembers = await prisma.messMember.findMany({
      where: { messId: activeMembership.messId },
      include: { user: true },
    });

    const memberMapById = new Map<string, string>();
    const memberMapByEmail = new Map<string, string>();
    for (const m of currentMembers) {
      memberMapById.set(m.id, m.id);
      memberMapByEmail.set(m.user.email.toLowerCase(), m.id);
    }

    function resolveMemberId(entry: { memberId?: string; member?: { id?: string; user?: { email?: string } } }): string {
      if (entry.member?.user?.email && memberMapByEmail.has(entry.member.user.email.toLowerCase())) {
        return memberMapByEmail.get(entry.member.user.email.toLowerCase())!;
      }
      if (entry.memberId && memberMapById.has(entry.memberId)) {
        return memberMapById.get(entry.memberId)!;
      }
      return activeMembership!.id; // Fallback to current manager
    }

    let importedBazarCount = 0;
    let importedDepositCount = 0;
    let importedMealCount = 0;

    // 1. Import Bazar Entries
    if (Array.isArray(bazarEntries)) {
      for (const item of bazarEntries) {
        const targetMemberId = resolveMemberId(item);
        await prisma.bazarEntry.create({
          data: {
            messMonthId: messMonth.id,
            memberId: targetMemberId,
            amount: Number(item.amount) || 0,
            category: item.category || 'General',
            date: item.date ? new Date(item.date) : new Date(),
            status: item.status || 'APPROVED',
            mode: item.mode || 'QUICK',
            items: item.items ?? null,
            notes: item.notes ? String(item.notes) : null,
          },
        });
        importedBazarCount++;
      }
    }

    // 2. Import Deposits
    if (Array.isArray(deposits)) {
      for (const item of deposits) {
        const targetMemberId = resolveMemberId(item);
        await prisma.deposit.create({
          data: {
            messMonthId: messMonth.id,
            memberId: targetMemberId,
            amount: Number(item.amount) || 0,
            date: item.date ? new Date(item.date) : new Date(),
            notes: item.notes ? String(item.notes) : null,
          },
        });
        importedDepositCount++;
      }
    }

    // 3. Import Daily Meals
    if (Array.isArray(dailyMeals)) {
      for (const item of dailyMeals) {
        const targetMemberId = resolveMemberId(item);
        const date = toStartOfDayUTC(item.date);
        await prisma.dailyMeal.upsert({
          where: {
            memberId_date: {
              memberId: targetMemberId,
              date,
            },
          },
          update: {
            lunch: typeof item.lunch === 'number' ? item.lunch : 1.0,
            dinner: typeof item.dinner === 'number' ? item.dinner : 1.0,
            isLeave: Boolean(item.isLeave),
            messMonthId: messMonth.id,
          },
          create: {
            messMonthId: messMonth.id,
            memberId: targetMemberId,
            date,
            lunch: typeof item.lunch === 'number' ? item.lunch : 1.0,
            dinner: typeof item.dinner === 'number' ? item.dinner : 1.0,
            isLeave: Boolean(item.isLeave),
          },
        });
        importedMealCount++;
      }
    }

    return jsonResponse({
      message: 'Mess data imported successfully',
      monthKey,
      counts: {
        bazarEntries: importedBazarCount,
        deposits: importedDepositCount,
        dailyMeals: importedMealCount,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
