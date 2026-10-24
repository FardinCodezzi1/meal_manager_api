import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function PUT(req: Request, props: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const params = await props.params;
    const { id: tourId, memberId } = params;
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
      return errorResponse('Forbidden: Only the Tour Lead or Super Admin can modify member roles', 403);
    }

    const targetMember = tour.members.find((m) => m.id === memberId);
    if (!targetMember) {
      return errorResponse('Tour member not found', 404);
    }

    const body = await req.json();
    const { role, name, phone } = body;

    if (role && !['LEAD', 'ACCOUNTANT', 'MEMBER'].includes(role)) {
      return errorResponse('Invalid role. Must be LEAD, ACCOUNTANT, or MEMBER', 400);
    }

    const updated = await prisma.tourMember.update({
      where: { id: memberId },
      data: {
        ...(role ? { role } : {}),
        ...(name && typeof name === 'string' ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
      },
    });

    return jsonResponse({
      message: 'Member updated successfully',
      member: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const params = await props.params;
    const { id: tourId, memberId } = params;
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
    const isSelf = currentMember?.id === memberId;

    if (!isLead && !isSelf && !isSuperAdmin) {
      return errorResponse('Forbidden: Only Tour Lead or Super Admin can remove members', 403);
    }

    const targetMember = tour.members.find((m) => m.id === memberId);
    if (!targetMember) {
      return errorResponse('Tour member not found', 404);
    }

    // Lead cannot leave if other members remain unless transferring lead or admin deleting
    if (targetMember.role === 'LEAD' && tour.members.length > 1 && !isSuperAdmin && isSelf) {
      return errorResponse('Lead cannot leave the tour without transferring leadership to another member.', 400);
    }

    await prisma.tourMember.delete({
      where: { id: memberId },
    });

    return jsonResponse({
      message: `Member "${targetMember.name}" removed from tour`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
