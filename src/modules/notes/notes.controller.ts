import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async getNotes(@CurrentUser('id') userId: string) {
    return this.notesService.getNotes(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNote(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.notesService.createNote(userId, body);
  }

  @Put(':id')
  async updateNote(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.notesService.updateNote(userId, id, body);
  }

  @Delete(':id')
  async deleteNote(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notesService.deleteNote(userId, id);
  }
}
