import { prisma } from '@/lib/prisma';
import { jsonResponse, errorResponse, handleOptions } from '@/lib/cors';
import { authenticateSuperAdmin } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const { user, errorResponse: authError } = await authenticateSuperAdmin(req);
    if (authError || !user) {
      return authError!;
    }

    const mess = await prisma.mess.findUnique({
      where: { id },
    });

    if (!mess) {
      return errorResponse('Mess not found', 404);
    }

    await prisma.mess.delete({
      where: { id },
    });

    return jsonResponse({
      message: `Mess "${mess.name}" deleted successfully by Super Admin.`,
      deletedMessId: id,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
