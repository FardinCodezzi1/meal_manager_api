import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';

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
}
