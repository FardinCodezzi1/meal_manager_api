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
    });

    const isMember = members.some((m) => m.userId === user.id);
    if (!isMember && !isSuperAdmin) {
      return errorResponse('Access denied. You are not a member of this tour.', 403);
    }

    return jsonResponse({ members });
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
    const canManage = currentMember?.role === 'LEAD' || currentMember?.role === 'ACCOUNTANT' || isSuperAdmin;

    if (!canManage) {
      return errorResponse('Forbidden: Only the Tour Lead, Accountant, or Super Admin can add members', 403);
    }

    const body = await req.json();
    const { name, email, phone, role } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return errorResponse('Member name is required', 400);
    }

    let linkedUser = null;
    if (email && typeof email === 'string' && email.trim()) {
      linkedUser = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
    }

    if (linkedUser) {
      const alreadyInTour = tour.members.find((m) => m.userId === linkedUser!.id);
      if (alreadyInTour) {
        return errorResponse(`User ${linkedUser.name} (${linkedUser.email}) is already a member of this tour.`, 400);
      }
    }

    const assignedRole = role === 'ACCOUNTANT' ? 'ACCOUNTANT' : 'MEMBER';

    const newMember = await prisma.tourMember.create({
      data: {
        tourId,
        userId: linkedUser?.id || null,
        name: name.trim(),
        email: email?.trim().toLowerCase() || linkedUser?.email || null,
        phone: phone?.trim() || linkedUser?.phone || null,
        role: assignedRole,
      },
    });

    return jsonResponse({
      message: 'Member added to tour successfully',
      member: newMember,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
