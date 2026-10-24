import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '@/common/guards/super-admin.guard';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async getPlatformData() {
    return this.adminService.getPlatformData();
  }

  @Post('users')
  async createUser(@Body() body: any) {
    return this.adminService.createUser(body);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('messes')
  async createMess(@Body() body: any) {
    return this.adminService.createMess(body);
  }

  @Delete('messes/:id')
  async deleteMess(@Param('id') id: string) {
    return this.adminService.deleteMess(id);
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateUser(id, body);
  }
}
