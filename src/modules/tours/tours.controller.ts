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
import { ToursService } from './tours.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/tours')
@UseGuards(JwtAuthGuard)
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get()
  async getTours(@CurrentUser() user: any, @Query('all') viewAll?: string) {
    return this.toursService.getTours(user, viewAll === 'true');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTour(@CurrentUser() user: any, @Body() body: any) {
    return this.toursService.createTour(user, body);
  }

  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  async joinTour(@CurrentUser() user: any, @Body() body: any) {
    return this.toursService.joinTour(user, body);
  }

  @Get(':id')
  async getTourById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.toursService.getTourById(user, id);
  }

  @Put(':id')
  async updateTour(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.toursService.updateTour(user, id, body);
  }

  @Delete(':id')
  async deleteTour(@CurrentUser() user: any, @Param('id') id: string) {
    return this.toursService.deleteTour(user, id);
  }

  @Get(':id/deposits')
  async getTourDeposits(@CurrentUser() user: any, @Param('id') id: string) {
    return this.toursService.getTourDeposits(user, id);
  }

  @Post(':id/deposits')
  @HttpCode(HttpStatus.CREATED)
  async createTourDeposit(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.toursService.createTourDeposit(user, id, body);
  }

  @Delete(':id/deposits/:depositId')
  async deleteTourDeposit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('depositId') depositId: string,
  ) {
    return this.toursService.deleteTourDeposit(user, id, depositId);
  }

  @Get(':id/expenses')
  async getTourExpenses(@CurrentUser() user: any, @Param('id') id: string) {
    return this.toursService.getTourExpenses(user, id);
  }

  @Post(':id/expenses')
  @HttpCode(HttpStatus.CREATED)
  async createTourExpense(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.toursService.createTourExpense(user, id, body);
  }

  @Delete(':id/expenses/:expenseId')
  async deleteTourExpense(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.toursService.deleteTourExpense(user, id, expenseId);
  }

  @Get(':id/members')
  async getTourMembers(@CurrentUser() user: any, @Param('id') id: string) {
    return this.toursService.getTourMembers(user, id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async createTourMember(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.toursService.createTourMember(user, id, body);
  }

  @Put(':id/members/:memberId')
  async updateTourMember(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: any,
  ) {
    return this.toursService.updateTourMember(user, id, memberId, body);
  }

  @Delete(':id/members/:memberId')
  async deleteTourMember(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.toursService.deleteTourMember(user, id, memberId);
  }
}
