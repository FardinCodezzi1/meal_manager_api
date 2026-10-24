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
    const [totalUsers, totalMesses, allMeals, approvedBazar] = await Promise.all([
      prisma.user.count(),
      prisma.mess.count(),
      prisma.dailyMeal.findMany({
        select: { lunch: true, dinner: true },
      }),
      prisma.bazarEntry.findMany({
        where: { status: 'APPROVED' },
        select: { amount: true },
      }),
    ]);

    const totalMealsCount = allMeals.reduce((sum, m) => sum + m.lunch + m.dinner, 0);
    const totalBazarSum = approvedBazar.reduce((sum, b) => sum + b.amount, 0);

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
      },
      users,
      messes,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
