import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('api/config')
export class AppConfigController {
  constructor(private readonly configService: AppConfigService) {}

  @Get()
  async getConfig() {
    return this.configService.getConfig();
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async updateConfig(@Body() body: any) {
    return this.configService.updateConfig(body);
  }
}
