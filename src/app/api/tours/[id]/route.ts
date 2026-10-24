import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const tourId = params.id;
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const isSuperAdmin = user.isSuperAdmin || user.email.toLowerCase() === 'fardin1.codezzi@gmail.com';

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
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
          orderBy: { joinedAt: 'asc' },
        },
        expenses: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { date: 'desc' },
        },
        deposits: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!tour) {
      return errorResponse('Tour not found', 404);
    }

    const currentMember = tour.members.find((m) => m.userId === user.id);
    if (!currentMember && !isSuperAdmin) {
      return errorResponse('Access denied. You are not a member of this tour.', 403);
    }

    // Financial calculations
    const totalDeposits = tour.deposits.reduce((acc, d) => acc + d.amount, 0);
    const totalExpenses = tour.expenses.reduce((acc, e) => acc + e.amount, 0);
    const balance = totalDeposits - totalExpenses;
    const budgetRemaining = tour.budget - totalExpenses;

    const activeMembersCount = tour.members.length || 1;
    const perMemberShare = totalExpenses / activeMembersCount;

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    for (const exp of tour.expenses) {
      const cat = exp.category || 'General';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + exp.amount;
    }

    // Member summaries
    const membersSummary = tour.members.map((m) => {
      const memberDeposits = tour.deposits
        .filter((d) => d.memberId === m.id)
        .reduce((acc, d) => acc + d.amount, 0);

      const memberExpenses = tour.expenses
        .filter((e) => e.memberId === m.id)
        .reduce((acc, e) => acc + e.amount, 0);

      const netBalance = memberDeposits - perMemberShare;

      return {
        id: m.id,
        userId: m.userId,
        name: m.name,
        email: m.email || m.user?.email || null,
        phone: m.phone || m.user?.phone || null,
        role: m.role,
        joinedAt: m.joinedAt,
        totalDeposited: Number(memberDeposits.toFixed(2)),
        totalSpent: Number(memberExpenses.toFixed(2)),
        shareCost: Number(perMemberShare.toFixed(2)),
        netBalance: Number(netBalance.toFixed(2)),
      };
    });

    return jsonResponse({
      tour: {
        id: tour.id,
        name: tour.name,
        description: tour.description,
        destination: tour.destination,
        startDate: tour.startDate,
        endDate: tour.endDate,
        budget: tour.budget,
        status: tour.status,
        inviteCode: tour.inviteCode,
        creatorId: tour.creatorId,
        createdAt: tour.createdAt,
        updatedAt: tour.updatedAt,
      },
      summary: {
        budget: tour.budget,
        totalDeposits: Number(totalDeposits.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        budgetRemaining: Number(budgetRemaining.toFixed(2)),
        perMemberShare: Number(perMemberShare.toFixed(2)),
        membersCount: tour.members.length,
        categoryBreakdown,
      },
      members: membersSummary,
      expenses: tour.expenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        category: e.category,
        date: e.date,
        notes: e.notes,
        spentBy: e.member ? e.member.name : 'Shared Tour Fund',
        memberId: e.memberId,
        createdAt: e.createdAt,
      })),
      deposits: tour.deposits.map((d) => ({
        id: d.id,
        amount: d.amount,
        date: d.date,
        notes: d.notes,
        paidBy: d.member.name,
        memberId: d.memberId,
        createdAt: d.createdAt,
      })),
      myRole: currentMember ? currentMember.role : (isSuperAdmin ? 'SUPER_ADMIN' : null),
      isSuperAdmin,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const tourId = params.id;
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const isSuperAdmin = user.isSuperAdmin || user.email.toLowerCase() === 'fardin1.codezzi@gmail.com';

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        members: true,
      },
    });

    if (!tour) {
      return errorResponse('Tour not found', 404);
    }

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const isLead = currentMember?.role === 'LEAD';

    if (!isLead && !isSuperAdmin) {
      return errorResponse('Forbidden: Only the Tour Lead or Super Admin can edit tour details', 403);
    }

    const body = await req.json();
    const { name, description, destination, startDate, endDate, budget, status } = body;

    const updatedTour = await prisma.tour.update({
      where: { id: tourId },
      data: {
        ...(name && typeof name === 'string' ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(destination !== undefined ? { destination: destination?.trim() || null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(budget !== undefined ? { budget: typeof budget === 'number' ? budget : (parseFloat(budget) || 0) } : {}),
        ...(status && ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status) ? { status } : {}),
      },
    });

    return jsonResponse({
      message: 'Tour updated successfully',
      tour: updatedTour,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const tourId = params.id;
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const isSuperAdmin = user.isSuperAdmin || user.email.toLowerCase() === 'fardin1.codezzi@gmail.com';

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        members: true,
      },
    });

    if (!tour) {
      return errorResponse('Tour not found', 404);
    }

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const isLead = currentMember?.role === 'LEAD';

    if (!isLead && !isSuperAdmin) {
      return errorResponse('Forbidden: Only the Tour Lead or Super Admin can delete this tour', 403);
    }

    await prisma.tour.delete({
      where: { id: tourId },
    });

    return jsonResponse({
      message: `Tour "${tour.name}" deleted successfully`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
