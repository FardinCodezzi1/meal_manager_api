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

    const members = await prisma.tourMember.findMany({
      where: { tourId },
    });

    const isMember = members.some((m) => m.userId === user.id);
    if (!isMember && !isSuperAdmin) {
      return errorResponse('Access denied. You are not a member of this tour.', 403);
    }

    const deposits = await prisma.tourDeposit.findMany({
      where: { tourId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return jsonResponse({ deposits });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
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
    const canRecord = currentMember?.role === 'LEAD' || currentMember?.role === 'ACCOUNTANT' || isSuperAdmin;

    if (!canRecord) {
      return errorResponse('Forbidden: Only the Tour Lead, Accountant, or Super Admin can record deposits', 403);
    }

    const body = await req.json();
    const { memberId, amount, date, notes } = body;

    if (!memberId || typeof memberId !== 'string') {
      return errorResponse('memberId is required', 400);
    }

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return errorResponse('Amount must be a positive number', 400);
    }

    const targetMember = tour.members.find((m) => m.id === memberId);
    if (!targetMember) {
      return errorResponse('Selected member is not part of this tour', 400);
    }

    const deposit = await prisma.tourDeposit.create({
      data: {
        tourId,
        memberId,
        amount: parsedAmount,
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return jsonResponse({
      message: 'Tour deposit recorded successfully',
      deposit,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
