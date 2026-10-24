import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  toStartOfDayUTC,
  getMonthKeyFromDate,
  getDatesBetween,
} from '@/common/utils/date.util';

@Injectable()
export class MealsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserActiveMembership(userId: string) {
    return this.prisma.messMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { mess: true },
    });
  }

  async getMeals(userId: string, monthKey?: string) {
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
        meals: [],
        groupedByDate: {},
      };
    }

    const meals = await this.prisma.dailyMeal.findMany({
      where: { messMonthId: messMonth.id },
      include: {
        member: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { memberId: 'asc' }],
    });

    const groupedByDate: Record<string, typeof meals> = {};
    for (const meal of meals) {
      const dateStr = meal.date.toISOString().split('T')[0];
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = [];
      }
      groupedByDate[dateStr].push(meal);
    }

    return {
      monthKey,
      messId: activeMembership.messId,
      messMonthId: messMonth.id,
      meals,
      groupedByDate,
    };
  }

  async updateMeal(userId: string, body: any) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const { memberId, date, lunch, dinner, isLeave } = body;
    if (!memberId || !date) {
      throw new BadRequestException('memberId and date are required');
    }

    if (activeMembership.role !== 'MANAGER' && activeMembership.id !== memberId) {
      throw new ForbiddenException('Forbidden: You can only update your own meal records');
    }

    const targetMember = await this.prisma.messMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.messId !== activeMembership.messId) {
      throw new NotFoundException('Target member does not exist in your mess');
    }

    const utcDate = toStartOfDayUTC(date);
    const monthKey = getMonthKeyFromDate(utcDate);

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

    const parsedLunch = lunch !== undefined ? Math.max(0, parseFloat(lunch) || 0) : 0;
    const parsedDinner = dinner !== undefined ? Math.max(0, parseFloat(dinner) || 0) : 0;
    const leaveFlag = Boolean(isLeave);

    const meal = await this.prisma.dailyMeal.upsert({
      where: {
        memberId_date: {
          memberId,
          date: utcDate,
        },
      },
      update: {
        lunch: parsedLunch,
        dinner: parsedDinner,
        isLeave: leaveFlag,
      },
      create: {
        messMonthId: messMonth.id,
        memberId,
        date: utcDate,
        lunch: parsedLunch,
        dinner: parsedDinner,
        isLeave: leaveFlag,
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
      message: 'Meal record updated successfully',
      meal,
    };
  }

  async createLeaveRequest(userId: string, body: any) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const { startDate, endDate, reason } = body;
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    const start = toStartOfDayUTC(startDate);
    const end = toStartOfDayUTC(endDate);

    if (start > end) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        memberId: activeMembership.id,
        startDate: start,
        endDate: end,
        reason: reason ? String(reason).trim() : null,
        status: 'PENDING',
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
      message: 'Leave request submitted successfully. Pending manager approval.',
      leaveRequest,
    };
  }

  async getLeaveRequests(userId: string) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const isManager = activeMembership.role === 'MANAGER';
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: isManager
        ? { member: { messId: activeMembership.messId } }
        : { memberId: activeMembership.id },
      include: {
        member: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { leaveRequests };
  }

  async approveLeaveRequest(userId: string, id: string, body: { status?: string }) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (activeMembership.role !== 'MANAGER') {
      throw new ForbiddenException('Forbidden: Only mess managers can approve or reject leave requests');
    }

    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!leaveRequest || leaveRequest.member.messId !== activeMembership.messId) {
      throw new NotFoundException('Leave request not found in your mess');
    }

    const { status } = body;
    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      throw new BadRequestException('Invalid status. Must be APPROVED or REJECTED');
    }

    const updatedLeaveRequest = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status },
      });

      if (status === 'APPROVED') {
        const dates = getDatesBetween(leaveRequest.startDate, leaveRequest.endDate);

        for (const date of dates) {
          const monthKey = getMonthKeyFromDate(date);

          let messMonth = await tx.messMonth.findUnique({
            where: {
              messId_monthKey: {
                messId: activeMembership.messId,
                monthKey,
              },
            },
          });

          if (!messMonth) {
            messMonth = await tx.messMonth.create({
              data: {
                messId: activeMembership.messId,
                monthKey,
                status: 'OPEN',
              },
            });
          }

          await tx.dailyMeal.upsert({
            where: {
              memberId_date: {
                memberId: leaveRequest.memberId,
                date,
              },
            },
            update: {
              lunch: 0,
              dinner: 0,
              isLeave: true,
            },
            create: {
              messMonthId: messMonth.id,
              memberId: leaveRequest.memberId,
              date,
              lunch: 0,
              dinner: 0,
              isLeave: true,
            },
          });
        }
      }

      return updated;
    });

    return {
      message: `Leave request marked as ${status}`,
      leaveRequest: updatedLeaveRequest,
    };
  }
}
