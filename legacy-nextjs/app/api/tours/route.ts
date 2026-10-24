import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

function generateTourInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'TOUR-';
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

    const { searchParams } = new URL(req.url);
    const viewAll = searchParams.get('all') === 'true';
    const isSuperAdmin = user.isSuperAdmin || user.email.toLowerCase() === 'fardin1.codezzi@gmail.com';

    // If super admin requests all tours, or filter by memberships
    let tourQuery = {};
    if (!viewAll || !isSuperAdmin) {
      tourQuery = {
        members: {
          some: {
            userId: user.id,
          },
        },
      };
    }

    const tours = await prisma.tour.findMany({
      where: tourQuery,
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
    });

    const result = tours.map((t) => {
      const totalDeposits = t.deposits.reduce((acc, d) => acc + d.amount, 0);
      const totalExpenses = t.expenses.reduce((acc, e) => acc + e.amount, 0);
      const balance = totalDeposits - totalExpenses;
      const myMembership = t.members.find((m) => m.userId === user.id);
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
        totalDeposits: Number(totalDeposits.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        membersCount: t.members.length,
        leadName: leadMember ? leadMember.name : 'Unknown',
        accountantNames: accountants.map((a) => a.name),
        myRole: myMembership ? myMembership.role : (isSuperAdmin ? 'SUPER_ADMIN' : null),
      };
    });

    return jsonResponse({ tours: result });
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

    const body = await req.json();
    const { name, description, destination, startDate, endDate, budget } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return errorResponse('Tour name is required', 400);
    }

    let inviteCode = generateTourInviteCode();
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existing = await prisma.tour.findUnique({
        where: { inviteCode },
      });
      if (!existing) {
        isCodeUnique = true;
      } else {
        inviteCode = generateTourInviteCode();
      }
    }

    const parsedBudget = typeof budget === 'number' ? budget : (parseFloat(budget) || 0);
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    // Create tour and set creator as LEAD
    const tour = await prisma.$transaction(async (tx) => {
      const newTour = await tx.tour.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          destination: destination?.trim() || null,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          budget: parsedBudget,
          status: 'ACTIVE',
          inviteCode,
          creatorId: user.id,
        },
      });

      const leadMember = await tx.tourMember.create({
        data: {
          tourId: newTour.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          role: 'LEAD',
        },
      });

      return {
        ...newTour,
        leadMember,
      };
    });

    return jsonResponse({
      message: 'Tour created successfully',
      tour,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
