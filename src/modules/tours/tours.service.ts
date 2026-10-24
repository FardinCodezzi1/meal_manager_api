import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';

function generateTourInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'TOUR-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
}

@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(user: any): boolean {
    return user?.isSuperAdmin || user?.email?.toLowerCase() === 'fardin1.codezzi@gmail.com';
  }

  async getTours(user: any, viewAll?: boolean) {
    const isSuper = this.isSuperAdmin(user);
    let tourQuery = {};
    if (!viewAll || !isSuper) {
      tourQuery = {
        members: {
          some: {
            userId: user.id,
          },
        },
      };
    }

    const tours = await this.prisma.tour.findMany({
      where: tourQuery,
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        expenses: {
          select: {
            amount: true,
          },
        },
        deposits: {
          select: {
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = tours.map((tour) => {
      const totalDeposits = tour.deposits.reduce((acc, d) => acc + d.amount, 0);
      const totalExpenses = tour.expenses.reduce((acc, e) => acc + e.amount, 0);
      const balance = totalDeposits - totalExpenses;
      const budgetRemaining = tour.budget - totalExpenses;
      const myMembership = tour.members.find((m) => m.userId === user.id);

      return {
        id: tour.id,
        name: tour.name,
        description: tour.description,
        destination: tour.destination,
        startDate: tour.startDate,
        endDate: tour.endDate,
        budget: tour.budget,
        status: tour.status,
        inviteCode: tour.inviteCode,
        creatorId: tour.creatorId,
        createdAt: tour.createdAt,
        updatedAt: tour.updatedAt,
        myRole: myMembership?.role || (isSuper ? 'SUPER_ADMIN' : null),
        membersCount: tour.members.length,
        totalDeposits: Number(totalDeposits.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        budgetRemaining: Number(budgetRemaining.toFixed(2)),
      };
    });

    return { tours: enriched };
  }

  async createTour(user: any, body: any) {
    const { name, description, destination, startDate, endDate, budget } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestException('Tour name is required');
    }

    const parsedBudget = typeof budget === 'number' ? budget : parseFloat(budget) || 0;

    let inviteCode = generateTourInviteCode();
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existing = await this.prisma.tour.findUnique({ where: { inviteCode } });
      if (!existing) isCodeUnique = true;
      else inviteCode = generateTourInviteCode();
    }

    const newTour = await this.prisma.$transaction(async (tx) => {
      const tour = await tx.tour.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          destination: destination?.trim() || null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          budget: parsedBudget,
          inviteCode,
          creatorId: user.id,
          status: 'PLANNING',
        },
      });

      const member = await tx.tourMember.create({
        data: {
          tourId: tour.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          role: 'LEAD',
        },
      });

      return { tour, member };
    });

    return {
      message: 'Tour created successfully',
      tour: {
        ...newTour.tour,
        leadMember: newTour.member,
      },
    };
  }

  async joinTour(user: any, body: { inviteCode?: string }) {
    const { inviteCode } = body;
    if (!inviteCode || typeof inviteCode !== 'string' || !inviteCode.trim()) {
      throw new BadRequestException('Invite code is required');
    }

    const tour = await this.prisma.tour.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
      include: { members: true },
    });

    if (!tour) {
      throw new NotFoundException('Invalid tour invite code. Tour not found.');
    }

    const existingMember = tour.members.find((m) => m.userId === user.id);
    if (existingMember) {
      return {
        message: 'You are already a member of this tour',
        tour,
        member: existingMember,
      };
    }

    const member = await this.prisma.tourMember.create({
      data: {
        tourId: tour.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: 'MEMBER',
      },
    });

    return {
      message: 'Successfully joined tour',
      tour,
      member,
    };
  }

  async getTourById(user: any, tourId: string) {
    const isSuper = this.isSuperAdmin(user);

    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        expenses: {
          include: { member: { select: { id: true, name: true } } },
          orderBy: { date: 'desc' },
        },
        deposits: {
          include: { member: { select: { id: true, name: true } } },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const currentMember = tour.members.find((m) => m.userId === user.id);
    if (!currentMember && !isSuper) {
      throw new ForbiddenException('Access denied. You are not a member of this tour.');
    }

    const totalDeposits = tour.deposits.reduce((acc, d) => acc + d.amount, 0);
    const totalExpenses = tour.expenses.reduce((acc, e) => acc + e.amount, 0);
    const balance = totalDeposits - totalExpenses;
    const budgetRemaining = tour.budget - totalExpenses;

    const activeMembersCount = tour.members.length || 1;
    const perMemberShare = totalExpenses / activeMembersCount;

    const categoryBreakdown: Record<string, number> = {};
    for (const exp of tour.expenses) {
      const cat = exp.category || 'General';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + exp.amount;
    }

    const membersSummary = tour.members.map((m) => {
      const memberDeposits = tour.deposits
        .filter((d) => d.memberId === m.id)
        .reduce((acc, d) => acc + d.amount, 0);

      const memberExpenses = tour.expenses
        .filter((e) => e.memberId === m.id)
        .reduce((acc, e) => acc + e.amount, 0);

      const netBalance = memberDeposits - perMemberShare;

      return {
        id: m.id,
        userId: m.userId,
        name: m.name,
        email: m.email || m.user?.email || null,
        phone: m.phone || m.user?.phone || null,
        role: m.role,
        joinedAt: m.joinedAt,
        totalDeposited: Number(memberDeposits.toFixed(2)),
        totalSpent: Number(memberExpenses.toFixed(2)),
        shareCost: Number(perMemberShare.toFixed(2)),
        netBalance: Number(netBalance.toFixed(2)),
      };
    });

    return {
      tour: {
        id: tour.id,
        name: tour.name,
        description: tour.description,
        destination: tour.destination,
        startDate: tour.startDate,
        endDate: tour.endDate,
        budget: tour.budget,
        status: tour.status,
        inviteCode: tour.inviteCode,
        creatorId: tour.creatorId,
        createdAt: tour.createdAt,
        updatedAt: tour.updatedAt,
      },
      summary: {
        budget: tour.budget,
        totalDeposits: Number(totalDeposits.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        budgetRemaining: Number(budgetRemaining.toFixed(2)),
        perMemberShare: Number(perMemberShare.toFixed(2)),
        membersCount: tour.members.length,
        categoryBreakdown,
      },
      members: membersSummary,
      expenses: tour.expenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        category: e.category,
        date: e.date,
        memberId: e.memberId,
        memberName: e.member?.name || 'Shared Tour Expense',
      })),
      deposits: tour.deposits.map((d) => ({
        id: d.id,
        amount: d.amount,
        date: d.date,
        notes: d.notes,
        memberId: d.memberId,
        memberName: d.member?.name || 'Unknown Participant',
      })),
    };
  }

  async updateTour(user: any, tourId: string, body: any) {
    const isSuper = this.isSuperAdmin(user);
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: { members: true },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const isLead = currentMember?.role === 'LEAD';

    if (!isLead && !isSuper) {
      throw new ForbiddenException('Forbidden: Only the Tour Lead or Super Admin can edit tour details');
    }

    const { name, description, destination, startDate, endDate, budget, status } = body;

    const updatedTour = await this.prisma.tour.update({
      where: { id: tourId },
      data: {
        ...(name && typeof name === 'string' ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(destination !== undefined ? { destination: destination?.trim() || null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(budget !== undefined ? { budget: typeof budget === 'number' ? budget : parseFloat(budget) || 0 } : {}),
        ...(status && ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status) ? { status } : {}),
      },
    });

    return {
      message: 'Tour updated successfully',
      tour: updatedTour,
    };
  }

  async deleteTour(user: any, tourId: string) {
    const isSuper = this.isSuperAdmin(user);
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: { members: true },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const isLead = currentMember?.role === 'LEAD';

    if (!isLead && !isSuper) {
      throw new ForbiddenException('Forbidden: Only the Tour Lead or Super Admin can delete this tour');
    }

    await this.prisma.tour.delete({ where: { id: tourId } });

    return {
      message: `Tour "${tour.name}" deleted successfully`,
    };
  }

  async getTourDeposits(user: any, tourId: string) {
    const isSuper = this.isSuperAdmin(user);
    const members = await this.prisma.tourMember.findMany({ where: { tourId } });
    const isMember = members.some((m) => m.userId === user.id);
    if (!isMember && !isSuper) {
      throw new ForbiddenException('Access denied. You are not a member of this tour.');
    }

    const deposits = await this.prisma.tourDeposit.findMany({
      where: { tourId },
      include: { member: { select: { id: true, name: true, role: true } } },
      orderBy: { date: 'desc' },
    });

    return { deposits };
  }

  async createTourDeposit(user: any, tourId: string, body: any) {
    const isSuper = this.isSuperAdmin(user);
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: { members: true },
    });

    if (!tour) throw new NotFoundException('Tour not found');

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const canRecord = currentMember?.role === 'LEAD' || currentMember?.role === 'ACCOUNTANT' || isSuper;

    if (!canRecord) {
      throw new ForbiddenException('Forbidden: Only the Tour Lead, Accountant, or Super Admin can record deposits');
    }

    const { memberId, amount, date, notes } = body;
    if (!memberId || typeof memberId !== 'string') {
      throw new BadRequestException('memberId is required');
    }

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    const targetMember = tour.members.find((m) => m.id === memberId);
    if (!targetMember) {
      throw new BadRequestException('Selected member is not part of this tour');
    }

    const deposit = await this.prisma.tourDeposit.create({
      data: {
        tourId,
        memberId,
        amount: parsedAmount,
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null,
      },
      include: { member: { select: { id: true, name: true } } },
    });

    return {
      message: 'Tour deposit recorded successfully',
      deposit,
    };
  }

  async deleteTourDeposit(user: any, tourId: string, depositId: string) {
    const isSuper = this.isSuperAdmin(user);
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: { members: true },
    });

    if (!tour) throw new NotFoundException('Tour not found');

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const canDelete = currentMember?.role === 'LEAD' || currentMember?.role === 'ACCOUNTANT' || isSuper;

    if (!canDelete) {
      throw new ForbiddenException('Forbidden: Only the Tour Lead, Accountant, or Super Admin can delete deposits');
    }

    await this.prisma.tourDeposit.delete({ where: { id: depositId } });

    return { message: 'Tour deposit deleted successfully' };
  }

  async getTourExpenses(user: any, tourId: string) {
    const isSuper = this.isSuperAdmin(user);
    const members = await this.prisma.tourMember.findMany({ where: { tourId } });
    const isMember = members.some((m) => m.userId === user.id);
    if (!isMember && !isSuper) {
      throw new ForbiddenException('Access denied. You are not a member of this tour.');
    }

    const expenses = await this.prisma.tourExpense.findMany({
      where: { tourId },
      include: { member: { select: { id: true, name: true, role: true } } },
      orderBy: { date: 'desc' },
    });

    return { expenses };
  }

  async createTourExpense(user: any, tourId: string, body: any) {
    const isSuper = this.isSuperAdmin(user);
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: { members: true },
    });

    if (!tour) throw new NotFoundException('Tour not found');

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const canRecord = currentMember?.role === 'LEAD' || currentMember?.role === 'ACCOUNTANT' || isSuper;

    if (!canRecord) {
      throw new ForbiddenException('Forbidden: Only the Tour Lead, Accountant, or Super Admin can log expenses');
    }

    const { title, amount, category, date, notes, memberId } = body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new BadRequestException('Expense title is required');
    }

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    const expense = await this.prisma.tourExpense.create({
      data: {
        tourId,
        memberId: memberId || null,
        title: title.trim(),
        amount: parsedAmount,
        category: category?.trim() || 'General',
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null,
      },
      include: { member: { select: { id: true, name: true } } },
    });

    return {
      message: 'Tour expense logged successfully',
      expense,
    };
  }

  async deleteTourExpense(user: any, tourId: string, expenseId: string) {
    const isSuper = this.isSuperAdmin(user);
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: { members: true },
    });

    if (!tour) throw new NotFoundException('Tour not found');

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const canDelete = currentMember?.role === 'LEAD' || currentMember?.role === 'ACCOUNTANT' || isSuper;

    if (!canDelete) {
      throw new ForbiddenException('Forbidden: Only the Tour Lead, Accountant, or Super Admin can delete expenses');
    }

    await this.prisma.tourExpense.delete({ where: { id: expenseId } });

    return { message: 'Tour expense deleted successfully' };
  }

  async getTourMembers(user: any, tourId: string) {
    const isSuper = this.isSuperAdmin(user);
    const members = await this.prisma.tourMember.findMany({
      where: { tourId },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    const isMember = members.some((m) => m.userId === user.id);
    if (!isMember && !isSuper) {
      throw new ForbiddenException('Access denied. You are not a member of this tour.');
    }

    return { members };
  }

  async createTourMember(user: any, tourId: string, body: any) {
    const isSuper = this.isSuperAdmin(user);
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: { members: true },
    });

    if (!tour) throw new NotFoundException('Tour not found');

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const canAdd = currentMember?.role === 'LEAD' || currentMember?.role === 'ACCOUNTANT' || isSuper;

    if (!canAdd) {
      throw new ForbiddenException('Forbidden: Only the Tour Lead, Accountant, or Super Admin can add participants');
    }

    const { name, phone, email, role } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestException('Participant name is required');
    }

    const memberRole = role && ['LEAD', 'ACCOUNTANT', 'MEMBER'].includes(role) ? role : 'MEMBER';

    const member = await this.prisma.tourMember.create({
      data: {
        tourId,
        userId: null,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        role: memberRole,
      },
    });

    return {
      message: 'Participant added to tour successfully',
      member,
    };
  }

  async updateTourMember(user: any, tourId: string, memberId: string, body: any) {
    const isSuper = this.isSuperAdmin(user);
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: { members: true },
    });

    if (!tour) throw new NotFoundException('Tour not found');

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const isLead = currentMember?.role === 'LEAD';

    if (!isLead && !isSuper) {
      throw new ForbiddenException('Forbidden: Only the Tour Lead or Super Admin can modify member roles');
    }

    const targetMember = tour.members.find((m) => m.id === memberId);
    if (!targetMember) throw new NotFoundException('Tour member not found');

    const { role, name, phone } = body;
    if (role && !['LEAD', 'ACCOUNTANT', 'MEMBER'].includes(role)) {
      throw new BadRequestException('Invalid role. Must be LEAD, ACCOUNTANT, or MEMBER');
    }

    const updated = await this.prisma.tourMember.update({
      where: { id: memberId },
      data: {
        ...(role ? { role } : {}),
        ...(name && typeof name === 'string' ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
      },
    });

    return {
      message: 'Member updated successfully',
      member: updated,
    };
  }

  async deleteTourMember(user: any, tourId: string, memberId: string) {
    const isSuper = this.isSuperAdmin(user);
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: { members: true },
    });

    if (!tour) throw new NotFoundException('Tour not found');

    const currentMember = tour.members.find((m) => m.userId === user.id);
    const isLead = currentMember?.role === 'LEAD';

    if (!isLead && !isSuper) {
      throw new ForbiddenException('Forbidden: Only the Tour Lead or Super Admin can remove members');
    }

    await this.prisma.tourMember.delete({ where: { id: memberId } });

    return { message: 'Tour member removed successfully' };
  }
}
