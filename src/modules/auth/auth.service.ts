import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '@/prisma/prisma.service';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-32-chars-min';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export function signToken(payload: { userId: string; email: string; isSuperAdmin?: boolean }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(body: { name?: string; email?: string; password?: string; phone?: string }) {
    const { name, email, password, phone } = body;

    if (!name || !email || !password) {
      throw new BadRequestException('Name, email, and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isSuperAdmin = normalizedEmail === 'fardin1.codezzi@gmail.com';

    const user = await this.prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone ? phone.trim() : null,
        isSuperAdmin,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });

    return {
      message: 'Registration successful',
      user,
      token,
    };
  }

  async login(body: { email?: string; password?: string }) {
    const { email, password } = body;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    let isSuperAdmin = user.isSuperAdmin;
    if (normalizedEmail === 'fardin1.codezzi@gmail.com' && !user.isSuperAdmin) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isSuperAdmin: true },
      });
      isSuperAdmin = true;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      isSuperAdmin,
    });

    return {
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
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const activeMembership = await this.prisma.messMember.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        mess: true,
      },
    });

    return {
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
    };
  }

  async updateMe(
    userId: string,
    body: {
      name?: string;
      phone?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { name, phone, email, currentPassword, newPassword } = body;
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new BadRequestException('Name cannot be empty');
      }
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone ? String(phone).trim() : null;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new BadRequestException('Valid email address is required');
      }
      if (normalizedEmail !== user.email) {
        const existing = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          throw new BadRequestException('Email address is already in use by another account');
        }
        updateData.email = normalizedEmail;
      }
    }

    if (newPassword !== undefined) {
      if (!currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        throw new BadRequestException('New password must be at least 6 characters long');
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await this.prisma.user.update({
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

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  async deleteMe(userId: string, body: { password?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password } = body;
    if (!password) {
      throw new BadRequestException('Password confirmation is required to delete your account');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password. Account deletion aborted.');
    }

    // Guard 1: Active membership check
    const activeMembership = await this.prisma.messMember.findFirst({
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
          throw new BadRequestException(
            'Cannot delete account: You are currently the MANAGER of an active mess with other members. You must transfer the manager role to another member or remove all members first.',
          );
        }
        throw new BadRequestException(
          'Cannot delete account: You are currently the manager of an active mess. Please delete your mess first (/api/mess) before deleting your account.',
        );
      }

      throw new BadRequestException(
        'Cannot delete account: You are currently an ACTIVE member of a mess. Please leave the mess first (/api/mess/leave) to settle records before deleting your account.',
      );
    }

    // Guard 2: Historical record check
    const pastMemberships = await this.prisma.messMember.findMany({
      where: { userId: user.id },
    });

    if (pastMemberships.length > 0) {
      await this.prisma.personalNote.deleteMany({
        where: { userId: user.id },
      });

      const randomSuffix = crypto.randomBytes(4).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: 'Former Member',
          email: `deleted_${user.id}_${randomSuffix}@anonymized.local`,
          phone: null,
          passwordHash: 'DELETED_ACCOUNT',
        },
      });

      return {
        message: 'Account successfully deactivated and personal data anonymized. Past mess accounting records were preserved.',
      };
    }

    await this.prisma.user.delete({
      where: { id: user.id },
    });

    return {
      message: 'Account permanently deleted successfully.',
    };
  }
}
