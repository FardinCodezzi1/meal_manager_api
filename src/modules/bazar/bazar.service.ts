import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { toStartOfDayUTC, getMonthKeyFromDate } from '@/common/utils/date.util';

@Injectable()
export class BazarService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserActiveMembership(userId: string) {
    return this.prisma.messMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { mess: true },
    });
  }

  async getBazarEntries(userId: string, monthKey?: string) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (!monthKey) {
      throw new BadRequestException('monthKey query parameter is required (e.g., ?monthKey=2026-10)');
    }

    const messMonth = await this.prisma.messMonth.findUnique({
      where: {
        messId_monthKey: {
          messId: activeMembership.messId,
          monthKey,
        },
      },
    });

    if (!messMonth) {
      return {
        monthKey,
        messId: activeMembership.messId,
        entries: [],
        stats: {
          totalEntries: 0,
          approvedCount: 0,
          pendingCount: 0,
          rejectedCount: 0,
          totalApprovedAmount: 0,
        },
      };
    }

    const entries = await this.prisma.bazarEntry.findMany({
      where: { messMonthId: messMonth.id },
      include: {
        member: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const stats = {
      totalEntries: entries.length,
      approvedCount: entries.filter((e) => e.status === 'APPROVED').length,
      pendingCount: entries.filter((e) => e.status === 'PENDING').length,
      rejectedCount: entries.filter((e) => e.status === 'REJECTED').length,
      totalApprovedAmount: entries
        .filter((e) => e.status === 'APPROVED')
        .reduce((sum, e) => sum + e.amount, 0),
    };

    return {
      monthKey,
      messId: activeMembership.messId,
      messMonthId: messMonth.id,
      entries,
      stats,
    };
  }

  async createBazarEntry(userId: string, body: any) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const { monthKey: reqMonthKey, amount, category, date, mode, items, notes } = body;

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      throw new BadRequestException('Category is required');
    }

    const entryDate = date ? new Date(date) : new Date();
    if (isNaN(entryDate.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }

    const targetDate = toStartOfDayUTC(entryDate);
    const monthKey = reqMonthKey || getMonthKeyFromDate(targetDate);

    let messMonth = await this.prisma.messMonth.findUnique({
      where: {
        messId_monthKey: {
          messId: activeMembership.messId,
          monthKey,
        },
      },
    });

    if (!messMonth) {
      messMonth = await this.prisma.messMonth.create({
        data: {
          messId: activeMembership.messId,
          monthKey,
          status: 'OPEN',
        },
      });
    }

    const isManager = activeMembership.role === 'MANAGER';
    const status = isManager ? 'APPROVED' : 'PENDING';

    const entry = await this.prisma.bazarEntry.create({
      data: {
        messMonthId: messMonth.id,
        memberId: activeMembership.id,
        date: targetDate,
        amount: parsedAmount,
        category: category.trim(),
        mode: mode || 'QUICK',
        items: items ?? null,
        notes: notes ? String(notes).trim() : null,
        status,
      },
      include: {
        member: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return {
      message: isManager
        ? 'Bazar entry created and automatically approved'
        : 'Bazar entry submitted and pending manager approval',
      entry,
    };
  }

  async updateBazarEntry(userId: string, id: string, body: any) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const entry = await this.prisma.bazarEntry.findUnique({
      where: { id },
      include: { messMonth: true },
    });

    if (!entry || entry.messMonth.messId !== activeMembership.messId) {
      throw new NotFoundException('Bazar entry not found in your mess');
    }

    const isManager = activeMembership.role === 'MANAGER';
    const isOwner = entry.memberId === activeMembership.id;

    if (!isManager && (!isOwner || (entry.status !== 'PENDING' && entry.status !== 'DRAFT'))) {
      throw new ForbiddenException('Forbidden: You can only edit your own pending or draft bazar entries');
    }

    const { amount, category, date, mode, items, notes, status } = body;
    const updateData: Record<string, unknown> = {};

    if (amount !== undefined) {
      const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new BadRequestException('Amount must be a positive number');
      }
      updateData.amount = parsedAmount;
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || !category.trim()) {
        throw new BadRequestException('Category cannot be empty');
      }
      updateData.category = category.trim();
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException('Invalid date provided');
      }
      updateData.date = toStartOfDayUTC(parsedDate);
    }

    if (mode !== undefined) updateData.mode = mode;
    if (items !== undefined) updateData.items = items;
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;

    if (status !== undefined) {
      if (!isManager) {
        throw new ForbiddenException('Forbidden: Only mess managers can change entry approval status');
      }
      updateData.status = status;
    }

    const updatedEntry = await this.prisma.bazarEntry.update({
      where: { id },
      data: updateData,
      include: {
        member: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return {
      message: 'Bazar entry updated successfully',
      entry: updatedEntry,
    };
  }

  async deleteBazarEntry(userId: string, id: string) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const entry = await this.prisma.bazarEntry.findUnique({
      where: { id },
      include: { messMonth: true },
    });

    if (!entry || entry.messMonth.messId !== activeMembership.messId) {
      throw new NotFoundException('Bazar entry not found in your mess');
    }

    const isManager = activeMembership.role === 'MANAGER';
    const isOwner = entry.memberId === activeMembership.id;

    if (!isManager && (!isOwner || (entry.status !== 'PENDING' && entry.status !== 'DRAFT'))) {
      throw new ForbiddenException('Forbidden: You can only delete your own pending or draft bazar entries');
    }

    await this.prisma.bazarEntry.delete({ where: { id } });

    return {
      message: 'Bazar entry deleted successfully',
      id,
    };
  }

  async approveBazarEntry(userId: string, id: string, body: { status?: string }) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (activeMembership.role !== 'MANAGER') {
      throw new ForbiddenException('Forbidden: Only mess managers can approve or reject bazar entries');
    }

    const entry = await this.prisma.bazarEntry.findUnique({
      where: { id },
      include: { messMonth: true },
    });

    if (!entry || entry.messMonth.messId !== activeMembership.messId) {
      throw new NotFoundException('Bazar entry not found in your mess');
    }

    const { status } = body;
    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      throw new BadRequestException('Invalid status. Must be APPROVED or REJECTED');
    }

    const updatedEntry = await this.prisma.bazarEntry.update({
      where: { id },
      data: { status },
      include: {
        member: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return {
      message: `Bazar entry marked as ${status}`,
      entry: updatedEntry,
    };
  }
}
