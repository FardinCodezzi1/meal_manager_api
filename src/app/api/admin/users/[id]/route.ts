import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateSuperAdmin } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const { user, errorResponse: authError } = await authenticateSuperAdmin(req);
    if (authError || !user) {
      return authError!;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return errorResponse('User not found', 404);
    }

    const body = await req.json();
    const { name, email, phone, newPassword, isSuperAdmin } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return errorResponse('Name cannot be empty', 400);
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return errorResponse('Valid email address is required', 400);
      }
      if (normalizedEmail !== targetUser.email) {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          return errorResponse('Email address is already in use by another user', 400);
        }
        updateData.email = normalizedEmail;
      }
    }

    if (phone !== undefined) {
      updateData.phone = phone ? String(phone).trim() : null;
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return errorResponse('New password must be at least 6 characters long', 400);
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (isSuperAdmin !== undefined) {
      updateData.isSuperAdmin = Boolean(isSuperAdmin);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonResponse({
      message: `User account for ${updatedUser.name} (${updatedUser.email}) updated successfully`,
      user: updatedUser,
      passwordReset: Boolean(newPassword),
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
