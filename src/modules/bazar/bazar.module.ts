import { Module } from '@nestjs/common';
import { BazarController } from './bazar.controller';
import { BazarService } from './bazar.service';

@Module({
  controllers: [BazarController],
  providers: [BazarService],
  exports: [BazarService],
})
export class BazarModule {}
