import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { MessModule } from './modules/mess/mess.module';
import { BazarModule } from './modules/bazar/bazar.module';
import { MealsModule } from './modules/meals/meals.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { NotesModule } from './modules/notes/notes.module';
import { SummaryModule } from './modules/summary/summary.module';
import { ToursModule } from './modules/tours/tours.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppConfigModule } from './modules/config/app-config.module';
import { DocsModule } from './modules/docs/docs.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MessModule,
    BazarModule,
    MealsModule,
    DepositsModule,
    NotesModule,
    SummaryModule,
    ToursModule,
    AdminModule,
    AppConfigModule,
    DocsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
