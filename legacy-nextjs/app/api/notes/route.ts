import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const notes = await prisma.personalNote.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    return jsonResponse({
      userId: user.id,
      notes,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function POST(req: Request) {
  try {
    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const body = await req.json();
    const { title, content, isChecklist, items } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return errorResponse('Title is required', 400);
    }

    const note = await prisma.personalNote.create({
      data: {
        userId: user.id,
        title: title.trim(),
        content: content ? String(content).trim() : '',
        isChecklist: Boolean(isChecklist),
        items: items ?? null,
      },
    });

    return jsonResponse(
      {
        message: 'Personal note created successfully',
        note,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
