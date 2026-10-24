import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

const GLOBAL_CONFIG_ID = 'global-config';

async function getOrCreateConfig() {
  let config = await prisma.appConfig.findUnique({
    where: { id: GLOBAL_CONFIG_ID },
  });

  if (!config) {
    config = await prisma.appConfig.create({
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

export async function GET() {
  try {
    const config = await getOrCreateConfig();
    return jsonResponse({
      config,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function PUT(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    // Ensure config exists
    await getOrCreateConfig();

    const body = await req.json();
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

    const updatedConfig = await prisma.appConfig.update({
      where: { id: GLOBAL_CONFIG_ID },
      data: updateData,
    });

    return jsonResponse({
      message: 'App configuration updated successfully',
      config: updatedConfig,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
