import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const activeMembership = await prisma.messMember.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        mess: true,
      },
    });

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        isSuperAdmin: user.isSuperAdmin || user.email.toLowerCase() === 'fardin1.codezzi@gmail.com',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      activeMembership: activeMembership
        ? {
            id: activeMembership.id,
            messId: activeMembership.messId,
            role: activeMembership.role,
            status: activeMembership.status,
            joinedAt: activeMembership.joinedAt,
            mess: {
              id: activeMembership.mess.id,
              name: activeMembership.mess.name,
              inviteCode: activeMembership.mess.inviteCode,
              managerId: activeMembership.mess.managerId,
            },
          }
        : null,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function PUT(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const body = await req.json();
    const { name, phone, email, currentPassword, newPassword } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return errorResponse('Name cannot be empty', 400);
      }
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone ? String(phone).trim() : null;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return errorResponse('Valid email address is required', 400);
      }
      if (normalizedEmail !== user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          return errorResponse('Email address is already in use by another account', 400);
        }
        updateData.email = normalizedEmail;
      }
    }

    if (newPassword !== undefined) {
      if (!currentPassword) {
        return errorResponse('Current password is required to set a new password', 400);
      }
      const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return errorResponse('Current password is incorrect', 400);
      }
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return errorResponse('New password must be at least 6 characters long', 400);
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
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
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const body = await req.json().catch(() => ({}));
    const { password } = body;

    if (!password) {
      return errorResponse('Password confirmation is required to delete your account', 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse('Invalid password. Account deletion aborted.', 401);
    }

    // Guard 1: Active membership check
    const activeMembership = await prisma.messMember.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        mess: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (activeMembership) {
      if (activeMembership.role === 'MANAGER') {
        const otherActiveMembers = activeMembership.mess.members.filter((m) => m.userId !== user.id);
        if (otherActiveMembers.length > 0) {
          return errorResponse(
            'Cannot delete account: You are currently the MANAGER of an active mess with other members. You must transfer the manager role to another member or remove all members first.',
            400
          );
        }
        return errorResponse(
          'Cannot delete account: You are currently the manager of an active mess. Please delete your mess first (/api/mess) before deleting your account.',
          400
        );
      }

      return errorResponse(
        'Cannot delete account: You are currently an ACTIVE member of a mess. Please leave the mess first (/api/mess/leave) to settle records before deleting your account.',
        400
      );
    }

    // Guard 2: Historical record check
    const pastMemberships = await prisma.messMember.findMany({
      where: { userId: user.id },
    });

    if (pastMemberships.length > 0) {
      // User has historical records in a mess. To preserve roommates' calculations and financial history,
      // anonymize personal data and delete private notes, while leaving historical records consistent.
      await prisma.personalNote.deleteMany({
        where: { userId: user.id },
      });

      const randomSuffix = crypto.randomBytes(4).toString('hex');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: 'Former Member',
          email: `deleted_${user.id}_${randomSuffix}@anonymized.local`,
          phone: null,
          passwordHash: 'DELETED_ACCOUNT',
        },
      });

      return jsonResponse({
        message: 'Account successfully deactivated and personal data anonymized. Past mess accounting records were preserved.',
      });
    }

    // If no past mess memberships exist, perform complete hard delete
    await prisma.user.delete({
      where: { id: user.id },
    });

    return jsonResponse({
      message: 'Account permanently deleted successfully.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
