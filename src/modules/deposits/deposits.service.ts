import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { toStartOfDayUTC, getMonthKeyFromDate } from '@/common/utils/date.util';

@Injectable()
export class DepositsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserActiveMembership(userId: string) {
    return this.prisma.messMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { mess: true },
    });
  }

  async getDeposits(userId: string, monthKey?: string) {
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
        totalDeposit: 0,
        deposits: [],
      };
    }

    const deposits = await this.prisma.deposit.findMany({
      where: { messMonthId: messMonth.id },
      include: {
        member: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);

    return {
      monthKey,
      messId: activeMembership.messId,
      messMonthId: messMonth.id,
      totalDeposit,
      deposits,
    };
  }

  async createDeposit(userId: string, body: any) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (activeMembership.role !== 'MANAGER') {
      throw new ForbiddenException('Forbidden: Only mess managers can record member deposits');
    }

    const { monthKey: reqMonthKey, memberId, amount, date, notes } = body;
    if (!memberId) {
      throw new BadRequestException('memberId is required');
    }

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    const targetMember = await this.prisma.messMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.messId !== activeMembership.messId) {
      throw new NotFoundException('Target member does not belong to your mess');
    }

    const depositDate = date ? new Date(date) : new Date();
    if (isNaN(depositDate.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }

    const monthKey = reqMonthKey || getMonthKeyFromDate(depositDate);

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

    const deposit = await this.prisma.deposit.create({
      data: {
        messMonthId: messMonth.id,
        memberId,
        amount: parsedAmount,
        date: depositDate,
        notes: notes ? String(notes).trim() : null,
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
      message: 'Deposit recorded successfully',
      deposit,
    };
  }

  async updateDeposit(userId: string, id: string, body: any) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (activeMembership.role !== 'MANAGER') {
      throw new ForbiddenException('Forbidden: Only mess managers can update deposit records');
    }

    const deposit = await this.prisma.deposit.findUnique({
      where: { id },
      include: { messMonth: true },
    });

    if (!deposit || deposit.messMonth.messId !== activeMembership.messId) {
      throw new NotFoundException('Deposit record not found in your mess');
    }

    const { amount, date, notes, memberId } = body;
    const updateData: Record<string, unknown> = {};

    if (amount !== undefined) {
      const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new BadRequestException('Amount must be a positive number');
      }
      updateData.amount = parsedAmount;
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException('Invalid date provided');
      }
      updateData.date = parsedDate;
    }

    if (notes !== undefined) {
      updateData.notes = notes ? String(notes).trim() : null;
    }

    if (memberId !== undefined) {
      const targetMember = await this.prisma.messMember.findUnique({ where: { id: memberId } });
      if (!targetMember || targetMember.messId !== activeMembership.messId) {
        throw new NotFoundException('Target member does not belong to your mess');
      }
      updateData.memberId = memberId;
    }

    const updatedDeposit = await this.prisma.deposit.update({
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
      message: 'Deposit updated successfully',
      deposit: updatedDeposit,
    };
  }

  async deleteDeposit(userId: string, id: string) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (activeMembership.role !== 'MANAGER') {
      throw new ForbiddenException('Forbidden: Only mess managers can delete deposit records');
    }

    const deposit = await this.prisma.deposit.findUnique({
      where: { id },
      include: { messMonth: true },
    });

    if (!deposit || deposit.messMonth.messId !== activeMembership.messId) {
      throw new NotFoundException('Deposit record not found in your mess');
    }

    await this.prisma.deposit.delete({ where: { id } });

    return {
      message: 'Deposit record deleted successfully',
      id,
    };
  }
}
