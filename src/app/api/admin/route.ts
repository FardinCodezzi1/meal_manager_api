import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateSuperAdmin } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateSuperAdmin(req);
    if (authError || !user) {
      return authError!;
    }

    // 1. Platform KPI Statistics
    const [totalUsers, totalMesses, allMeals, approvedBazar, rawTours] = await Promise.all([
      prisma.user.count(),
      prisma.mess.count(),
      prisma.dailyMeal.findMany({
        select: { lunch: true, dinner: true },
      }),
      prisma.bazarEntry.findMany({
        where: { status: 'APPROVED' },
        select: { amount: true },
      }),
      prisma.tour.findMany({
        include: {
          members: {
            select: {
              id: true,
              userId: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          expenses: {
            select: {
              amount: true,
            },
          },
          deposits: {
            select: {
              amount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalMealsCount = allMeals.reduce((sum, m) => sum + m.lunch + m.dinner, 0);
    const totalBazarSum = approvedBazar.reduce((sum, b) => sum + b.amount, 0);

    // Tour KPI summaries
    const totalTours = rawTours.length;
    const totalTourBudget = rawTours.reduce((sum, t) => sum + t.budget, 0);
    let totalTourExpenses = 0;
    let totalTourDeposits = 0;

    const tours = rawTours.map((t) => {
      const depositsSum = t.deposits.reduce((acc, d) => acc + d.amount, 0);
      const expensesSum = t.expenses.reduce((acc, e) => acc + e.amount, 0);
      const balance = depositsSum - expensesSum;
      totalTourDeposits += depositsSum;
      totalTourExpenses += expensesSum;

      const leadMember = t.members.find((m) => m.role === 'LEAD');
      const accountants = t.members.filter((m) => m.role === 'ACCOUNTANT');

      return {
        id: t.id,
        name: t.name,
        description: t.description,
        destination: t.destination,
        startDate: t.startDate,
        endDate: t.endDate,
        budget: t.budget,
        status: t.status,
        inviteCode: t.inviteCode,
        creatorId: t.creatorId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        totalDeposits: Number(depositsSum.toFixed(2)),
        totalExpenses: Number(expensesSum.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        membersCount: t.members.length,
        leadName: leadMember ? leadMember.name : 'Unknown',
        accountantNames: accountants.map((a) => a.name),
      };
    });

    // 2. Full List of Registered Users with Active Mess and Role
    const rawUsers = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            mess: {
              select: {
                id: true,
                name: true,
                inviteCode: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = rawUsers.map((u) => {
      const activeMembership = u.memberships.find((m) => m.status === 'ACTIVE');
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        isSuperAdmin: u.isSuperAdmin,
        createdAt: u.createdAt,
        activeMess: activeMembership
          ? {
              id: activeMembership.mess.id,
              name: activeMembership.mess.name,
              inviteCode: activeMembership.mess.inviteCode,
              role: activeMembership.role,
              joinedAt: activeMembership.joinedAt,
            }
          : null,
        currentRole: activeMembership ? activeMembership.role : 'NO_MESS',
      };
    });

    // 3. Full List of Messes with Member Counts and Manager Names
    const rawMesses = await prisma.mess.findMany({
      include: {
        members: {
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
      orderBy: { createdAt: 'desc' },
    });

    const messes = rawMesses.map((m) => {
      const activeMembers = m.members.filter((mem) => mem.status === 'ACTIVE');
      const managerMember = m.members.find((mem) => mem.role === 'MANAGER' && mem.status === 'ACTIVE')
        || m.members.find((mem) => mem.userId === m.managerId);

      return {
        id: m.id,
        name: m.name,
        inviteCode: m.inviteCode,
        managerId: m.managerId,
        managerName: managerMember ? managerMember.user.name : 'Unknown Manager',
        managerEmail: managerMember ? managerMember.user.email : 'Unknown',
        totalMembersCount: m.members.length,
        activeMembersCount: activeMembers.length,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
    });

    return jsonResponse({
      stats: {
        totalUsers,
        totalMesses,
        totalMeals: Number(totalMealsCount.toFixed(1)),
        totalBazarAmount: Number(totalBazarSum.toFixed(2)),
        totalTours,
        totalTourBudget: Number(totalTourBudget.toFixed(2)),
        totalTourExpenses: Number(totalTourExpenses.toFixed(2)),
        totalTourDeposits: Number(totalTourDeposits.toFixed(2)),
      },
      users,
      messes,
      tours,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
