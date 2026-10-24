import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MealsService } from './meals.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Get()
  async getMeals(@CurrentUser('id') userId: string, @Query('monthKey') monthKey?: string) {
    return this.mealsService.getMeals(userId, monthKey);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  async updateMeal(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.mealsService.updateMeal(userId, body);
  }

  @Post('leave-request')
  @HttpCode(HttpStatus.CREATED)
  async createLeaveRequest(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.mealsService.createLeaveRequest(userId, body);
  }

  @Get('leave-requests')
  async getLeaveRequests(@CurrentUser('id') userId: string) {
    return this.mealsService.getLeaveRequests(userId);
  }

  @Post('leave-requests')
  @HttpCode(HttpStatus.CREATED)
  async createLeaveRequestsAlias(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.mealsService.createLeaveRequest(userId, body);
  }

  @Patch('leave-requests/:id')
  async approveLeaveRequest(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.mealsService.approveLeaveRequest(userId, id, body);
  }
}
