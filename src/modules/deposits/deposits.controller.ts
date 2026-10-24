import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/deposits')
@UseGuards(JwtAuthGuard)
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get()
  async getDeposits(@CurrentUser('id') userId: string, @Query('monthKey') monthKey?: string) {
    return this.depositsService.getDeposits(userId, monthKey);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDeposit(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.depositsService.createDeposit(userId, body);
  }

  @Put(':id')
  async updateDeposit(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.depositsService.updateDeposit(userId, id, body);
  }

  @Delete(':id')
  async deleteDeposit(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.depositsService.deleteDeposit(userId, id);
  }
}
