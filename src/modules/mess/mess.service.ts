import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { toStartOfDayUTC } from '@/common/utils/date.util';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'MESS-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
}

@Injectable()
export class MessService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserActiveMembership(userId: string) {
    return this.prisma.messMember.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        mess: true,
      },
    });
  }

  async getMess(userId: string) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const mess = await this.prisma.mess.findUnique({
      where: { id: activeMembership.messId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        months: {
          orderBy: { monthKey: 'desc' },
        },
      },
    });

    if (!mess) {
      throw new NotFoundException('Mess not found');
    }

    return {
      mess,
      currentRole: activeMembership.role,
    };
  }

  async updateMess(
    userId: string,
    body: { name?: string; newManagerMemberId?: string; regenerateInviteCode?: boolean },
  ) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (activeMembership.role !== 'MANAGER') {
      throw new ForbiddenException('Forbidden: Only the mess manager can update mess settings');
    }

    const { name, newManagerMemberId, regenerateInviteCode } = body;
    const messId = activeMembership.messId;
    let newInviteCode: string | undefined;

    if (regenerateInviteCode) {
      let unique = false;
      while (!unique) {
        newInviteCode = generateInviteCode();
        const existing = await this.prisma.mess.findUnique({ where: { inviteCode: newInviteCode } });
        if (!existing) unique = true;
      }
    }

    const updatedMess = await this.prisma.$transaction(async (tx) => {
      if (newManagerMemberId) {
        if (newManagerMemberId === activeMembership.id) {
          throw new BadRequestException('You are already the manager of this mess');
        }

        const targetMember = await tx.messMember.findUnique({
          where: { id: newManagerMemberId },
        });

        if (!targetMember || targetMember.messId !== messId || targetMember.status !== 'ACTIVE') {
          throw new BadRequestException('Target user is not an active member of this mess');
        }

        await tx.messMember.update({
          where: { id: activeMembership.id },
          data: { role: 'MEMBER' },
        });

        await tx.messMember.update({
          where: { id: newManagerMemberId },
          data: { role: 'MANAGER' },
        });

        await tx.mess.update({
          where: { id: messId },
          data: { managerId: targetMember.userId },
        });
      }

      const updatePayload: Record<string, unknown> = {};
      if (name && typeof name === 'string' && name.trim()) {
        updatePayload.name = name.trim();
      }
      if (newInviteCode) {
        updatePayload.inviteCode = newInviteCode;
      }

      if (Object.keys(updatePayload).length > 0) {
        return tx.mess.update({
          where: { id: messId },
          data: updatePayload,
        });
      }

      return tx.mess.findUnique({ where: { id: messId } });
    });

    return {
      message: 'Mess updated successfully',
      mess: updatedMess,
    };
  }

  async deleteMess(userId: string, body: { password?: string; force?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (activeMembership.role !== 'MANAGER') {
      throw new ForbiddenException('Forbidden: Only the mess manager can delete the mess');
    }

    const { password, force } = body;
    if (!password) {
      throw new BadRequestException('Manager password confirmation is required to close the mess');
    }

    const isPasswordValid = await bcrypt.compare(password, user?.passwordHash || '');
    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid manager password. Mess closure aborted.');
    }

    const otherActiveMembers = await this.prisma.messMember.findMany({
      where: {
        messId: activeMembership.messId,
        status: 'ACTIVE',
        userId: { not: userId },
      },
    });

    if (otherActiveMembers.length > 0 && !force) {
      throw new BadRequestException(
        `Cannot delete mess: There are still ${otherActiveMembers.length} other active member(s) in this mess. All other members must leave the mess first, or you must transfer the manager role before deleting.`,
      );
    }

    await this.prisma.mess.delete({
      where: { id: activeMembership.messId },
    });

    return {
      message:
        'Mess closed and deleted successfully. All members have been released, and you are now free to create or join another mess.',
    };
  }

  async createMess(userId: string, body: { name?: string }) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (activeMembership) {
      throw new BadRequestException(
        'You already have an active mess membership. Leave your current mess before creating a new one.',
      );
    }

    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestException('Mess name is required');
    }

    let inviteCode = generateInviteCode();
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existing = await this.prisma.mess.findUnique({ where: { inviteCode } });
      if (!existing) {
        isCodeUnique = true;
      } else {
        inviteCode = generateInviteCode();
      }
    }

    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const newMess = await this.prisma.$transaction(async (tx) => {
      const mess = await tx.mess.create({
        data: {
          name: name.trim(),
          inviteCode,
          managerId: userId,
        },
      });

      const member = await tx.messMember.create({
        data: {
          userId,
          messId: mess.id,
          role: 'MANAGER',
          status: 'ACTIVE',
        },
      });

      const month = await tx.messMonth.create({
        data: {
          messId: mess.id,
          monthKey: currentMonthKey,
          status: 'OPEN',
        },
      });

      return { mess, member, month };
    });

    return {
      message: 'Mess created successfully',
      mess: newMess.mess,
      membership: newMess.member,
      currentMonth: newMess.month,
    };
  }

  async joinMess(userId: string, body: { inviteCode?: string }) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (activeMembership) {
      throw new BadRequestException(
        'You already have an active mess membership. Leave your current mess before joining another.',
      );
    }

    const { inviteCode } = body;
    if (!inviteCode || typeof inviteCode !== 'string' || !inviteCode.trim()) {
      throw new BadRequestException('Invite code is required');
    }

    const mess = await this.prisma.mess.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });

    if (!mess) {
      throw new NotFoundException('Invalid invite code: Mess not found');
    }

    const previousMembership = await this.prisma.messMember.findFirst({
      where: {
        userId,
        messId: mess.id,
      },
    });

    let member;
    if (previousMembership) {
      member = await this.prisma.messMember.update({
        where: { id: previousMembership.id },
        data: {
          status: 'ACTIVE',
          leftAt: null,
          role: 'MEMBER',
        },
      });
    } else {
      member = await this.prisma.messMember.create({
        data: {
          userId,
          messId: mess.id,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      });
    }

    return {
      message: 'Joined mess successfully',
      membership: member,
      mess: {
        id: mess.id,
        name: mess.name,
        inviteCode: mess.inviteCode,
      },
    };
  }

  async leaveMess(userId: string) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently an active member of any mess');
    }

    const updatedMembership = await this.prisma.messMember.update({
      where: { id: activeMembership.id },
      data: {
        status: 'LEFT',
        leftAt: new Date(),
      },
    });

    return {
      message: 'You have left the mess successfully. Historical records have been preserved.',
      membership: updatedMembership,
    };
  }

  async getMembers(userId: string, queryMessId?: string) {
    let messId = queryMessId;
    if (!messId) {
      const activeMembership = await this.getUserActiveMembership(userId);
      if (!activeMembership) {
        throw new BadRequestException(
          'You are not currently in an active mess. Please specify messId or join a mess.',
        );
      }
      messId = activeMembership.messId;
    }

    const members = await this.prisma.messMember.findMany({
      where: { messId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    return {
      messId,
      members,
    };
  }

  async getMonths(userId: string) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const months = await this.prisma.messMonth.findMany({
      where: { messId: activeMembership.messId },
      orderBy: { monthKey: 'desc' },
    });

    return {
      messId: activeMembership.messId,
      months,
    };
  }

  async createMonth(userId: string, body: { monthKey?: string }) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const { monthKey } = body;
    if (!monthKey || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
      throw new BadRequestException('Invalid monthKey format. Expected format: YYYY-MM (e.g., 2026-10)');
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (monthKey > currentMonthKey) {
      throw new BadRequestException(
        `Cannot create future months. Max allowed month is current month (${currentMonthKey})`,
      );
    }

    const existingMonth = await this.prisma.messMonth.findUnique({
      where: {
        messId_monthKey: {
          messId: activeMembership.messId,
          monthKey,
        },
      },
    });

    if (existingMonth) {
      throw new BadRequestException(`Month ${monthKey} already exists for this mess`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const newMonth = await tx.messMonth.create({
        data: {
          messId: activeMembership.messId,
          monthKey,
          status: 'OPEN',
        },
      });

      const mess = await tx.mess.findUnique({
        where: { id: activeMembership.messId },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
          managerSequences: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      let rotationResult: any = null;

      if (mess && mess.rotationType === 'MONTHLY' && mess.members.length > 1) {
        const activeMembers = mess.members;
        const currentManagerMember =
          activeMembers.find((m) => m.role === 'MANAGER') ||
          activeMembers.find((m) => m.userId === mess.managerId);

        let sequence = mess.managerSequences.map((s) => s.memberId);
        const activeMemberIds = new Set(activeMembers.map((m) => m.id));
        sequence = sequence.filter((id) => activeMemberIds.has(id));

        for (const mem of activeMembers) {
          if (!sequence.includes(mem.id)) {
            sequence.push(mem.id);
          }
        }

        if (sequence.length > 1 && currentManagerMember) {
          const currentIndex = sequence.indexOf(currentManagerMember.id);
          const nextIndex = (currentIndex + 1) % sequence.length;
          const nextManagerMemberId = sequence[nextIndex];
          const nextManagerMember = activeMembers.find((m) => m.id === nextManagerMemberId);

          if (nextManagerMember && nextManagerMember.id !== currentManagerMember.id) {
            await tx.messMember.update({
              where: { id: currentManagerMember.id },
              data: { role: 'MEMBER' },
            });

            await tx.messMember.update({
              where: { id: nextManagerMember.id },
              data: { role: 'MANAGER' },
            });

            await tx.mess.update({
              where: { id: mess.id },
              data: { managerId: nextManagerMember.userId },
            });

            await tx.managerAuditLog.create({
              data: {
                messId: mess.id,
                action: 'AUTOMATIC_MONTHLY_ROTATION',
                changedById: userId,
                previousManagerId: currentManagerMember.id,
                newManagerId: nextManagerMember.id,
                reason: `Automatic monthly manager rotation executed for month ${monthKey}`,
              },
            });

            rotationResult = {
              rotated: true,
              previousManager: {
                memberId: currentManagerMember.id,
                name: currentManagerMember.user.name,
              },
              newManager: {
                memberId: nextManagerMember.id,
                name: nextManagerMember.user.name,
              },
            };
          }
        }
      }

      return { newMonth, rotationResult };
    });

    return {
      message: `Month ${monthKey} opened successfully`,
      month: result.newMonth,
      managerRotation: result.rotationResult,
    };
  }

  async getManagerSequence(userId: string) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const mess = await this.prisma.mess.findUnique({
      where: { id: activeMembership.messId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        managerSequences: {
          orderBy: { orderIndex: 'asc' },
          include: {
            member: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phone: true },
                },
              },
            },
          },
        },
      },
    });

    if (!mess) {
      throw new NotFoundException('Mess not found');
    }

    const activeMembers = mess.members;
    const activeMemberMap = new Map(activeMembers.map((m) => [m.id, m]));
    let existingSequence = mess.managerSequences.filter((s) => activeMemberMap.has(s.memberId));

    if (existingSequence.length === 0) {
      const currentManagerMember =
        activeMembers.find((m) => m.role === 'MANAGER') ||
        activeMembers.find((m) => m.userId === mess.managerId) ||
        activeMembers[0];

      const orderedMembers = [
        currentManagerMember,
        ...activeMembers.filter((m) => m.id !== currentManagerMember?.id),
      ].filter(Boolean);

      await this.prisma.$transaction(
        orderedMembers.map((mem, index) =>
          this.prisma.managerSequence.upsert({
            where: {
              messId_memberId: {
                messId: mess.id,
                memberId: mem!.id,
              },
            },
            update: { orderIndex: index },
            create: {
              messId: mess.id,
              memberId: mem!.id,
              orderIndex: index,
            },
          }),
        ),
      );

      existingSequence = await this.prisma.managerSequence.findMany({
        where: { messId: mess.id },
        orderBy: { orderIndex: 'asc' },
        include: {
          member: {
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
        },
      });
    }

    const currentManager =
      activeMembers.find((m) => m.role === 'MANAGER') ||
      activeMembers.find((m) => m.userId === mess.managerId) ||
      activeMembers[0];

    return {
      messId: mess.id,
      rotationType: mess.rotationType,
      currentManagerMemberId: currentManager?.id,
      currentManager: currentManager
        ? {
            id: currentManager.id,
            name: currentManager.user.name,
            email: currentManager.user.email,
          }
        : null,
      sequence: existingSequence.map((s, index) => ({
        orderIndex: index,
        memberId: s.memberId,
        name: s.member.user.name,
        email: s.member.user.email,
        phone: s.member.user.phone,
        isCurrentManager: s.memberId === currentManager?.id,
      })),
    };
  }

  async updateManagerSequence(
    userId: string,
    body: { memberIds?: string[]; rotationType?: string; reason?: string },
  ) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (activeMembership.role !== 'MANAGER') {
      throw new ForbiddenException('Forbidden: Only the mess manager can update the rotation queue');
    }

    const { memberIds, rotationType, reason } = body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      throw new BadRequestException('memberIds array is required and cannot be empty');
    }

    const mess = await this.prisma.mess.findUnique({
      where: { id: activeMembership.messId },
      include: {
        members: { where: { status: 'ACTIVE' } },
        managerSequences: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!mess) {
      throw new NotFoundException('Mess not found');
    }

    const activeMemberIds = new Set(mess.members.map((m) => m.id));
    for (const memId of memberIds) {
      if (!activeMemberIds.has(memId)) {
        throw new BadRequestException(`Member ${memId} is not an active member of this mess`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.managerSequence.deleteMany({ where: { messId: mess.id } });

      for (let i = 0; i < memberIds.length; i++) {
        await tx.managerSequence.create({
          data: {
            messId: mess.id,
            memberId: memberIds[i],
            orderIndex: i,
          },
        });
      }

      if (rotationType) {
        await tx.mess.update({
          where: { id: mess.id },
          data: { rotationType },
        });
      }

      await tx.managerAuditLog.create({
        data: {
          messId: mess.id,
          action: 'SEQUENCE_REORDERED',
          changedById: userId,
          reason: reason || 'Manager sequence reordered',
        },
      });
    });

    return {
      message: 'Manager rotation queue updated successfully',
    };
  }

  async transferManagerRole(
    userId: string,
    body: { targetMemberId?: string; reason?: string },
  ) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const { targetMemberId, reason } = body;
    if (!targetMemberId || typeof targetMemberId !== 'string') {
      throw new BadRequestException('targetMemberId is required');
    }

    const mess = await this.prisma.mess.findUnique({
      where: { id: activeMembership.messId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!mess) {
      throw new NotFoundException('Mess not found');
    }

    const targetMember = mess.members.find((m) => m.id === targetMemberId);
    if (!targetMember) {
      throw new NotFoundException('Target member not found or is not active in this mess');
    }

    const previousManagerMember =
      mess.members.find((m) => m.role === 'MANAGER') ||
      mess.members.find((m) => m.userId === mess.managerId);

    if (previousManagerMember?.id === targetMember.id) {
      throw new BadRequestException('Selected member is already the active manager of this mess');
    }

    await this.prisma.$transaction(async (tx) => {
      if (previousManagerMember) {
        await tx.messMember.update({
          where: { id: previousManagerMember.id },
          data: { role: 'MEMBER' },
        });
      }

      await tx.messMember.update({
        where: { id: targetMember.id },
        data: { role: 'MANAGER' },
      });

      await tx.mess.update({
        where: { id: mess.id },
        data: { managerId: targetMember.userId },
      });

      await tx.managerAuditLog.create({
        data: {
          messId: mess.id,
          action: 'MANUAL_OVERRIDE',
          changedById: userId,
          previousManagerId: previousManagerMember?.id,
          newManagerId: targetMember.id,
          reason: reason || 'Manual manager role override',
        },
      });
    });

    return {
      message: 'Manager role transferred successfully',
      transfer: {
        previousManager: previousManagerMember
          ? {
              id: previousManagerMember.id,
              name: previousManagerMember.user.name,
            }
          : null,
        newManager: {
          id: targetMember.id,
          name: targetMember.user.name,
        },
      },
    };
  }

  async getManagerLogs(userId: string) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    const rawLogs = await this.prisma.managerAuditLog.findMany({
      where: { messId: activeMembership.messId },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = new Set<string>();
    const memberIds = new Set<string>();

    for (const log of rawLogs) {
      if (log.changedById) userIds.add(log.changedById);
      if (log.previousManagerId) memberIds.add(log.previousManagerId);
      if (log.newManagerId) memberIds.add(log.newManagerId);
    }

    const [users, members] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.messMember.findMany({
        where: { id: { in: Array.from(memberIds) } },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const logs = rawLogs.map((log) => {
      const changedByUser = userMap.get(log.changedById);
      const prevMember = log.previousManagerId ? memberMap.get(log.previousManagerId) : null;
      const newMember = log.newManagerId ? memberMap.get(log.newManagerId) : null;

      return {
        id: log.id,
        action: log.action,
        reason: log.reason,
        createdAt: log.createdAt,
        changedBy: changedByUser
          ? {
              id: changedByUser.id,
              name: changedByUser.name,
              email: changedByUser.email,
            }
          : null,
        previousManager: prevMember
          ? {
              id: prevMember.id,
              name: prevMember.user.name,
            }
          : null,
        newManager: newMember
          ? {
              id: newMember.id,
              name: newMember.user.name,
            }
          : null,
      };
    });

    return {
      messId: activeMembership.messId,
      logs,
    };
  }

  async exportData(userId: string, monthKey?: string) {
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
      include: {
        mess: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
            managerId: true,
          },
        },
        bazarEntries: {
          include: {
            member: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        deposits: {
          include: {
            member: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        dailyMeals: {
          include: {
            member: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!messMonth) {
      throw new NotFoundException(`Data for month ${monthKey} not found`);
    }

    return {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      monthKey,
      mess: messMonth.mess,
      bazarEntries: messMonth.bazarEntries,
      deposits: messMonth.deposits,
      dailyMeals: messMonth.dailyMeals,
    };
  }

  async importData(userId: string, body: any) {
    const activeMembership = await this.getUserActiveMembership(userId);
    if (!activeMembership) {
      throw new BadRequestException('You are not currently in an active mess');
    }

    if (activeMembership.role !== 'MANAGER') {
      throw new ForbiddenException('Forbidden: Only mess managers can import mess data');
    }

    const { monthKey, bazarEntries, deposits, dailyMeals } = body;
    if (!monthKey || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
      throw new BadRequestException('Valid monthKey (YYYY-MM) is required in the import payload');
    }

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

    const currentMembers = await this.prisma.messMember.findMany({
      where: { messId: activeMembership.messId },
      include: { user: true },
    });

    const memberMapById = new Map<string, string>();
    const memberMapByEmail = new Map<string, string>();

    for (const mem of currentMembers) {
      memberMapById.set(mem.id, mem.id);
      memberMapByEmail.set(mem.user.email.toLowerCase(), mem.id);
    }

    let importedBazar = 0;
    let importedDeposits = 0;
    let importedMeals = 0;

    await this.prisma.$transaction(async (tx) => {
      if (Array.isArray(bazarEntries)) {
        for (const entry of bazarEntries) {
          const resolvedMemberId =
            (entry.member?.user?.email && memberMapByEmail.get(entry.member.user.email.toLowerCase())) ||
            (entry.memberId && memberMapById.get(entry.memberId)) ||
            activeMembership.id;

          await tx.bazarEntry.create({
            data: {
              messMonthId: messMonth!.id,
              memberId: resolvedMemberId,
              date: entry.date ? toStartOfDayUTC(entry.date) : new Date(),
              amount: Number(entry.amount) || 0,
              category: entry.category || 'General',
              mode: entry.mode || 'QUICK',
              items: entry.items ?? null,
              notes: entry.notes ?? null,
              status: entry.status || 'APPROVED',
            },
          });
          importedBazar++;
        }
      }

      if (Array.isArray(deposits)) {
        for (const dep of deposits) {
          const resolvedMemberId =
            (dep.member?.user?.email && memberMapByEmail.get(dep.member.user.email.toLowerCase())) ||
            (dep.memberId && memberMapById.get(dep.memberId)) ||
            activeMembership.id;

          await tx.deposit.create({
            data: {
              messMonthId: messMonth!.id,
              memberId: resolvedMemberId,
              amount: Number(dep.amount) || 0,
              date: dep.date ? new Date(dep.date) : new Date(),
              notes: dep.notes ?? null,
            },
          });
          importedDeposits++;
        }
      }

      if (Array.isArray(dailyMeals)) {
        for (const meal of dailyMeals) {
          const resolvedMemberId =
            (meal.member?.user?.email && memberMapByEmail.get(meal.member.user.email.toLowerCase())) ||
            (meal.memberId && memberMapById.get(meal.memberId));

          if (resolvedMemberId && meal.date) {
            const mealDate = toStartOfDayUTC(meal.date);
            await tx.dailyMeal.upsert({
              where: {
                memberId_date: {
                  memberId: resolvedMemberId,
                  date: mealDate,
                },
              },
              update: {
                lunch: Number(meal.lunch) || 0,
                dinner: Number(meal.dinner) || 0,
                isLeave: Boolean(meal.isLeave),
              },
              create: {
                messMonthId: messMonth!.id,
                memberId: resolvedMemberId,
                date: mealDate,
                lunch: Number(meal.lunch) || 0,
                dinner: Number(meal.dinner) || 0,
                isLeave: Boolean(meal.isLeave),
              },
            });
            importedMeals++;
          }
        }
      }
    });

    return {
      message: 'Mess data imported successfully',
      monthKey,
      stats: {
        importedBazar,
        importedDeposits,
        importedMeals,
      },
    };
  }
}
