import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SummaryService } from './summary.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/summary')
@UseGuards(JwtAuthGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  async getSummary(@CurrentUser('id') userId: string, @Query('monthKey') monthKey?: string) {
    return this.summaryService.getSummary(userId, monthKey);
  }
}
