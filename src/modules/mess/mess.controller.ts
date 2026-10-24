import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessService } from './mess.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/mess')
@UseGuards(JwtAuthGuard)
export class MessController {
  constructor(private readonly messService: MessService) {}

  @Get()
  async getMess(@CurrentUser('id') userId: string) {
    return this.messService.getMess(userId);
  }

  @Put()
  async updateMess(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.messService.updateMess(userId, body);
  }

  @Delete()
  async deleteMess(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.messService.deleteMess(userId, body);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createMess(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.messService.createMess(userId, body);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  async joinMess(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.messService.joinMess(userId, body);
  }

  @Post('leave')
  @HttpCode(HttpStatus.OK)
  async leaveMess(@CurrentUser('id') userId: string) {
    return this.messService.leaveMess(userId);
  }

  @Get('members')
  async getMembers(@CurrentUser('id') userId: string, @Query('messId') queryMessId?: string) {
    return this.messService.getMembers(userId, queryMessId);
  }

  @Get('months')
  async getMonths(@CurrentUser('id') userId: string) {
    return this.messService.getMonths(userId);
  }

  @Post('months')
  @HttpCode(HttpStatus.CREATED)
  async createMonth(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.messService.createMonth(userId, body);
  }

  @Get('manager/sequence')
  async getManagerSequence(@CurrentUser('id') userId: string) {
    return this.messService.getManagerSequence(userId);
  }

  @Put('manager/sequence')
  async updateManagerSequence(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.messService.updateManagerSequence(userId, body);
  }

  @Post('manager/transfer')
  @HttpCode(HttpStatus.OK)
  async transferManagerRole(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.messService.transferManagerRole(userId, body);
  }

  @Get('manager/logs')
  async getManagerLogs(@CurrentUser('id') userId: string) {
    return this.messService.getManagerLogs(userId);
  }

  @Get('export')
  async exportData(@CurrentUser('id') userId: string, @Query('monthKey') monthKey?: string) {
    return this.messService.exportData(userId, monthKey);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importData(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.messService.importData(userId, body);
  }
}
