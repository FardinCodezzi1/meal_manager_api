import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotes(userId: string) {
    const notes = await this.prisma.personalNote.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      userId,
      notes,
    };
  }

  async createNote(userId: string, body: any) {
    const { title, content, isChecklist, items } = body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new BadRequestException('Title is required');
    }

    const note = await this.prisma.personalNote.create({
      data: {
        userId,
        title: title.trim(),
        content: content ? String(content).trim() : '',
        isChecklist: Boolean(isChecklist),
        items: items ?? null,
      },
    });

    return {
      message: 'Personal note created successfully',
      note,
    };
  }

  async updateNote(userId: string, id: string, body: any) {
    const note = await this.prisma.personalNote.findUnique({ where: { id } });
    if (!note || note.userId !== userId) {
      throw new NotFoundException('Note not found or does not belong to you');
    }

    const { title, content, isChecklist, items } = body;
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        throw new BadRequestException('Title cannot be empty');
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

    const updatedNote = await this.prisma.personalNote.update({
      where: { id },
      data: updateData,
    });

    return {
      message: 'Note updated successfully',
      note: updatedNote,
    };
  }

  async deleteNote(userId: string, id: string) {
    const note = await this.prisma.personalNote.findUnique({ where: { id } });
    if (!note || note.userId !== userId) {
      throw new NotFoundException('Note not found or does not belong to you');
    }

    await this.prisma.personalNote.delete({ where: { id } });

    return {
      message: 'Note deleted successfully',
      id,
    };
  }
}
