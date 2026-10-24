import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { signToken } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse('Invalid email or password', 401);
    }

    // Automatically promote fardin1.codezzi@gmail.com to Super Admin
    let isSuperAdmin = user.isSuperAdmin;
    if (normalizedEmail === 'fardin1.codezzi@gmail.com') {
      if (!user.isSuperAdmin) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isSuperAdmin: true },
        });
      }
      isSuperAdmin = true;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      isSuperAdmin,
    });

    return jsonResponse({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        isSuperAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
