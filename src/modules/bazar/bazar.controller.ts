import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BazarService } from './bazar.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/bazar')
@UseGuards(JwtAuthGuard)
export class BazarController {
  constructor(private readonly bazarService: BazarService) {}

  @Get()
  async getBazarEntries(@CurrentUser('id') userId: string, @Query('monthKey') monthKey?: string) {
    return this.bazarService.getBazarEntries(userId, monthKey);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBazarEntry(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.bazarService.createBazarEntry(userId, body);
  }

  @Put(':id')
  async updateBazarEntry(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.bazarService.updateBazarEntry(userId, id, body);
  }

  @Delete(':id')
  async deleteBazarEntry(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.bazarService.deleteBazarEntry(userId, id);
  }

  @Patch(':id/approve')
  async approveBazarEntry(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.bazarService.approveBazarEntry(userId, id, body);
  }
}
