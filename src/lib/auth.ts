import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { errorResponse } from './cors';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-32-chars-min';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export interface JwtPayload {
  userId: string;
  email: string;
  isSuperAdmin?: boolean;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      errorResponse: errorResponse('Unauthorized: Missing or invalid Authorization header', 401),
    };
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    return {
      user: null,
      errorResponse: errorResponse('Unauthorized: Invalid or expired token', 401),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    return {
      user: null,
      errorResponse: errorResponse('Unauthorized: User not found', 401),
    };
  }

  return { user, errorResponse: null };
}

export async function authenticateSuperAdmin(req: Request) {
  const { user, errorResponse: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return { user: null, errorResponse: authError };
  }

  const isSuperAdmin = user.isSuperAdmin || user.email.toLowerCase() === 'fardin1.codezzi@gmail.com';
  if (!isSuperAdmin) {
    return {
      user: null,
      errorResponse: errorResponse('Forbidden: Super Admin access required', 403),
    };
  }

  return { user, errorResponse: null };
}

export async function getUserActiveMembership(userId: string) {
  return prisma.messMember.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      mess: true,
    },
  });
}
