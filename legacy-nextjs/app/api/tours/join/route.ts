import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const body = await req.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== 'string' || !inviteCode.trim()) {
      return errorResponse('Valid inviteCode is required', 400);
    }

    const tour = await prisma.tour.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
      include: {
        members: true,
      },
    });

    if (!tour) {
      return errorResponse('Invalid invite code. Tour not found.', 404);
    }

    const existingMember = tour.members.find((m) => m.userId === user.id);
    if (existingMember) {
      return errorResponse('You are already a member of this tour.', 400);
    }

    const newMember = await prisma.tourMember.create({
      data: {
        tourId: tour.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: 'MEMBER',
      },
    });

    return jsonResponse({
      message: 'Successfully joined tour',
      tour: {
        id: tour.id,
        name: tour.name,
        destination: tour.destination,
        inviteCode: tour.inviteCode,
      },
      member: newMember,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
