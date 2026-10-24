import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';

function generateAdminMessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'MESS-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformData() {
    const [totalUsers, totalMesses, allMeals, approvedBazar, rawTours] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.mess.count(),
      this.prisma.dailyMeal.findMany({ select: { lunch: true, dinner: true } }),
      this.prisma.bazarEntry.findMany({ where: { status: 'APPROVED' }, select: { amount: true } }),
      this.prisma.tour.findMany({
        include: {
          members: {
            select: { id: true, userId: true, name: true, email: true, phone: true, role: true },
          },
          expenses: { select: { amount: true } },
          deposits: { select: { amount: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalMealsCount = allMeals.reduce((sum, m) => sum + m.lunch + m.dinner, 0);
    const totalBazarSum = approvedBazar.reduce((sum, b) => sum + b.amount, 0);

    const totalTours = rawTours.length;
    const totalTourBudget = rawTours.reduce((sum, t) => sum + t.budget, 0);
    let totalTourExpenses = 0;
    let totalTourDeposits = 0;

    const tours = rawTours.map((t) => {
      const depositsSum = t.deposits.reduce((acc, d) => acc + d.amount, 0);
      const expensesSum = t.expenses.reduce((acc, e) => acc + e.amount, 0);
      const balance = depositsSum - expensesSum;
      totalTourDeposits += depositsSum;
      totalTourExpenses += expensesSum;

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
        totalDeposits: Number(depositsSum.toFixed(2)),
        totalExpenses: Number(expensesSum.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        membersCount: t.members.length,
        leadName: leadMember ? leadMember.name : 'Unknown',
        accountantNames: accountants.map((a) => a.name),
      };
    });

    const rawUsers = await this.prisma.user.findMany({
      include: {
        memberships: {
          include: {
            mess: { select: { id: true, name: true, inviteCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = rawUsers.map((u) => {
      const activeMembership = u.memberships.find((m) => m.status === 'ACTIVE');
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        isSuperAdmin: u.isSuperAdmin,
        createdAt: u.createdAt,
        activeMess: activeMembership
          ? {
              id: activeMembership.mess.id,
              name: activeMembership.mess.name,
              inviteCode: activeMembership.mess.inviteCode,
              role: activeMembership.role,
              joinedAt: activeMembership.joinedAt,
            }
          : null,
        currentRole: activeMembership ? activeMembership.role : 'NO_MESS',
      };
    });

    const rawMesses = await this.prisma.mess.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const messes = rawMesses.map((m) => {
      const activeMembers = m.members.filter((mem) => mem.status === 'ACTIVE');
      const managerMember =
        m.members.find((mem) => mem.role === 'MANAGER' && mem.status === 'ACTIVE') ||
        m.members.find((mem) => mem.userId === m.managerId);

      return {
        id: m.id,
        name: m.name,
        inviteCode: m.inviteCode,
        managerId: m.managerId,
        managerName: managerMember ? managerMember.user.name : 'Unknown Manager',
        managerEmail: managerMember ? managerMember.user.email : 'Unknown',
        totalMembersCount: m.members.length,
        activeMembersCount: activeMembers.length,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
    });

    return {
      stats: {
        totalUsers,
        totalMesses,
        totalMeals: Number(totalMealsCount.toFixed(1)),
        totalBazarAmount: Number(totalBazarSum.toFixed(2)),
        totalTours,
        totalTourBudget: Number(totalTourBudget.toFixed(2)),
        totalTourExpenses: Number(totalTourExpenses.toFixed(2)),
        totalTourDeposits: Number(totalTourDeposits.toFixed(2)),
      },
      users,
      messes,
      tours,
    };
  }

  async deleteMess(id: string) {
    const mess = await this.prisma.mess.findUnique({ where: { id } });
    if (!mess) {
      throw new NotFoundException('Mess not found');
    }

    await this.prisma.mess.delete({ where: { id } });

    return {
      message: `Mess "${mess.name}" deleted successfully by Super Admin.`,
      deletedMessId: id,
    };
  }

  async updateUser(id: string, body: any) {
    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const { name, email, phone, newPassword, isSuperAdmin } = body;
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new BadRequestException('Name cannot be empty');
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new BadRequestException('Valid email address is required');
      }
      if (normalizedEmail !== targetUser.email) {
        const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing) {
          throw new BadRequestException('Email address is already in use by another user');
        }
        updateData.email = normalizedEmail;
      }
    }

    if (phone !== undefined) {
      updateData.phone = phone ? String(phone).trim() : null;
    }

    let passwordReset = false;
    if (newPassword !== undefined) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        throw new BadRequestException('New password must be at least 6 characters long');
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      passwordReset = true;
    }

    if (isSuperAdmin !== undefined) {
      updateData.isSuperAdmin = Boolean(isSuperAdmin);
    }

    const updatedUser = await this.prisma.user.update({
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

    return {
      message: 'User details updated successfully by Super Admin',
      passwordReset,
      user: updatedUser,
    };
  }

  async createUser(body: { name: string; email: string; password: string; phone?: string; isSuperAdmin?: boolean }) {
    const { name, email, password, phone, isSuperAdmin } = body;
    if (!name?.trim()) throw new BadRequestException('Name is required');
    if (!email?.trim() || !email.includes('@')) throw new BadRequestException('Valid email is required');
    if (!password || password.length < 6) throw new BadRequestException('Password must be at least 6 characters');

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new BadRequestException('Email address is already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        passwordHash,
        isSuperAdmin: Boolean(isSuperAdmin),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    });

    return {
      message: `User "${user.name}" created successfully by Super Admin`,
      user,
    };
  }

  async deleteUser(id: string) {
    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) throw new NotFoundException('User not found');

    // 1. Handle messes managed by this user
    const managedMesses = await this.prisma.mess.findMany({ where: { managerId: id } });
    for (const mess of managedMesses) {
      const anotherMember = await this.prisma.messMember.findFirst({
        where: { messId: mess.id, userId: { not: id }, status: 'ACTIVE' },
      });
      if (anotherMember) {
        await this.prisma.mess.update({
          where: { id: mess.id },
          data: { managerId: anotherMember.userId },
        });
        await this.prisma.messMember.update({
          where: { id: anotherMember.id },
          data: { role: 'MANAGER' },
        });
      } else {
        // Cascade delete empty mess if no other members exist
        await this.deleteMess(mess.id);
      }
    }

    // 2. Handle tours created by this user
    const createdTours = await this.prisma.tour.findMany({ where: { creatorId: id } });
    for (const tour of createdTours) {
      const anotherTourMember = await this.prisma.tourMember.findFirst({
        where: { tourId: tour.id, userId: { not: id } },
      });
      if (anotherTourMember) {
        await this.prisma.tour.update({
          where: { id: tour.id },
          data: { creatorId: anotherTourMember.userId },
        });
      } else {
        await this.prisma.tourExpense.deleteMany({ where: { tourId: tour.id } });
        await this.prisma.tourDeposit.deleteMany({ where: { tourId: tour.id } });
        await this.prisma.tourMember.deleteMany({ where: { tourId: tour.id } });
        await this.prisma.tour.delete({ where: { id: tour.id } });
      }
    }

    // 3. Cascade delete user records and delete user
    await this.prisma.$transaction([
      this.prisma.personalNote.deleteMany({ where: { userId: id } }),
      this.prisma.tourMember.deleteMany({ where: { userId: id } }),
      this.prisma.dailyMeal.deleteMany({ where: { member: { userId: id } } }),
      this.prisma.bazarEntry.deleteMany({ where: { member: { userId: id } } }),
      this.prisma.deposit.deleteMany({ where: { member: { userId: id } } }),
      this.prisma.leaveRequest.deleteMany({ where: { member: { userId: id } } }),
      this.prisma.managerSequence.deleteMany({ where: { member: { userId: id } } }),
      this.prisma.messMember.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return {
      message: `User "${targetUser.name}" (${targetUser.email}) permanently deleted by Super Admin.`,
      deletedUserId: id,
    };
  }

  async createMess(body: { name: string; managerId: string; memberIds?: string[] }) {
    const { name, managerId, memberIds } = body;
    if (!name?.trim()) throw new BadRequestException('Mess name is required');
    if (!managerId) throw new BadRequestException('Manager user ID is required');

    const managerUser = await this.prisma.user.findUnique({ where: { id: managerId } });
    if (!managerUser) throw new NotFoundException('Manager user not found');

    let inviteCode = generateAdminMessCode();
    let unique = false;
    while (!unique) {
      const existing = await this.prisma.mess.findUnique({ where: { inviteCode } });
      if (!existing) unique = true;
      else inviteCode = generateAdminMessCode();
    }

    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const mess = await this.prisma.$transaction(async (tx) => {
      const m = await tx.mess.create({
        data: {
          name: name.trim(),
          inviteCode,
          managerId,
        },
      });

      // Create manager membership
      await tx.messMember.create({
        data: {
          userId: managerId,
          messId: m.id,
          role: 'MANAGER',
          status: 'ACTIVE',
        },
      });

      // Create initial active month
      await tx.messMonth.create({
        data: {
          messId: m.id,
          monthKey: currentMonthKey,
          status: 'OPEN',
        },
      });

      // If additional members provided, add them as MEMBER
      if (Array.isArray(memberIds)) {
        for (const memId of memberIds) {
          if (memId && memId !== managerId) {
            await tx.messMember.create({
              data: {
                userId: memId,
                messId: m.id,
                role: 'MEMBER',
                status: 'ACTIVE',
              },
            });
          }
        }
      }

      return m;
    });

    return {
      message: `Mess "${mess.name}" created successfully by Super Admin`,
      mess,
    };
  }
}
