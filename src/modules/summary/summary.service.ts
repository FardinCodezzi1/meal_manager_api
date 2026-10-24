import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserActiveMembership(userId: string) {
    return this.prisma.messMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { mess: true },
    });
  }

  async getSummary(userId: string, monthKey?: string) {
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
        totalApprovedBazar: 0,
        totalDeposits: 0,
        totalMeals: 0,
        mealRate: 0,
        memberSummaries: [],
      };
    }

    // 1. Fetch only APPROVED bazar entries (strictly exclude PENDING and REJECTED)
    const approvedBazar = await this.prisma.bazarEntry.findMany({
      where: {
        messMonthId: messMonth.id,
        status: 'APPROVED',
      },
    });
    const totalApprovedBazar = approvedBazar.reduce((sum, item) => sum + item.amount, 0);

    // 2. Fetch all deposits for this month
    const deposits = await this.prisma.deposit.findMany({
      where: { messMonthId: messMonth.id },
    });
    const totalDeposits = deposits.reduce((sum, item) => sum + item.amount, 0);

    // 3. Fetch all meals for this month
    const meals = await this.prisma.dailyMeal.findMany({
      where: { messMonthId: messMonth.id },
    });
    const totalMeals = meals.reduce((sum, item) => sum + item.lunch + item.dinner, 0);

    // 4. Calculate meal rate
    const rawMealRate = totalMeals > 0 ? totalApprovedBazar / totalMeals : 0;
    const mealRate = Number(rawMealRate.toFixed(2));

    // 5. Fetch all members in this mess (both ACTIVE and LEFT)
    const members = await this.prisma.messMember.findMany({
      where: { messId: activeMembership.messId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Build per-member summaries
    const memberSummaries = members.map((member) => {
      const memberMeals = meals.filter((m) => m.memberId === member.id);
      const memberTotalMeals = memberMeals.reduce((sum, m) => sum + m.lunch + m.dinner, 0);

      const memberDeposits = deposits.filter((d) => d.memberId === member.id);
      const memberTotalDeposit = memberDeposits.reduce((sum, d) => sum + d.amount, 0);

      const mealCost = Number((memberTotalMeals * rawMealRate).toFixed(2));
      const balance = Number((memberTotalDeposit - mealCost).toFixed(2));

      return {
        memberId: member.id,
        userId: member.userId,
        name: member.user.name,
        role: member.role,
        status: member.status,
        totalMeals: Number(memberTotalMeals.toFixed(1)),
        totalDeposit: memberTotalDeposit,
        mealCost,
        balance,
      };
    });

    return {
      monthKey,
      messId: activeMembership.messId,
      messMonthId: messMonth.id,
      totalApprovedBazar,
      totalDeposits,
      totalMeals: Number(totalMeals.toFixed(1)),
      mealRate,
      memberSummaries,
    };
  }
}
