import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

const GLOBAL_CONFIG_ID = 'global-config';

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConfig() {
    let config = await this.prisma.appConfig.findUnique({
      where: { id: GLOBAL_CONFIG_ID },
    });

    if (!config) {
      config = await this.prisma.appConfig.create({
        data: {
          id: GLOBAL_CONFIG_ID,
          appName: 'Mess Meal Manager',
          creatorName: 'Fardin Abu Ubaid',
          creatorEmail: 'fardin1.codezzi@gmail.com',
          creatorPortfolio: 'https://portfolio-fardin.vercel.app',
          creatorBio: 'Full-Stack Developer & Creator of Mess Meal Manager',
          noticeActive: false,
        },
      });
    }

    return config;
  }

  async getConfig() {
    const config = await this.getOrCreateConfig();
    return { config };
  }

  async updateConfig(body: any) {
    await this.getOrCreateConfig();

    const {
      appName,
      appIconSvg,
      creatorName,
      creatorEmail,
      creatorPortfolio,
      creatorBio,
      broadcastNotice,
      noticeActive,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (appName !== undefined) updateData.appName = String(appName).trim();
    if (appIconSvg !== undefined) updateData.appIconSvg = appIconSvg ? String(appIconSvg) : null;
    if (creatorName !== undefined) updateData.creatorName = String(creatorName).trim();
    if (creatorEmail !== undefined) updateData.creatorEmail = String(creatorEmail).trim();
    if (creatorPortfolio !== undefined) updateData.creatorPortfolio = String(creatorPortfolio).trim();
    if (creatorBio !== undefined) updateData.creatorBio = creatorBio ? String(creatorBio).trim() : null;
    if (broadcastNotice !== undefined) updateData.broadcastNotice = broadcastNotice ? String(broadcastNotice).trim() : null;
    if (noticeActive !== undefined) updateData.noticeActive = Boolean(noticeActive);

    const updatedConfig = await this.prisma.appConfig.update({
      where: { id: GLOBAL_CONFIG_ID },
      data: updateData,
    });

    return {
      message: 'App configuration updated successfully',
      config: updatedConfig,
    };
  }
}
