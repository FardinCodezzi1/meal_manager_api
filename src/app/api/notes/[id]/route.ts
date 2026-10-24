import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateRequest } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const note = await prisma.personalNote.findUnique({
      where: { id },
    });

    if (!note || note.userId !== user.id) {
      return errorResponse('Note not found or does not belong to you', 404);
    }

    const body = await req.json();
    const { title, content, isChecklist, items } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return errorResponse('Title cannot be empty', 400);
      }
      updateData.title = title.trim();
    }

    if (content !== undefined) {
      updateData.content = String(content);
    }

    if (isChecklist !== undefined) {
      updateData.isChecklist = Boolean(isChecklist);
    }

    if (items !== undefined) {
      updateData.items = items;
    }

    const updatedNote = await prisma.personalNote.update({
      where: { id },
      data: updateData,
    });

    return jsonResponse({
      message: 'Note updated successfully',
      note: updatedNote,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const { user, errorResponse: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return authError!;
    }

    const note = await prisma.personalNote.findUnique({
      where: { id },
    });

    if (!note || note.userId !== user.id) {
      return errorResponse('Note not found or does not belong to you', 404);
    }

    await prisma.personalNote.delete({
      where: { id },
    });

    return jsonResponse({
      message: 'Note deleted successfully',
      id,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
