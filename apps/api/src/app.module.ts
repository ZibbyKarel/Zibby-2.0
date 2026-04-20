import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './modules/db/db.module';
import { SseModule } from './modules/sse/sse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    SseModule,
  ],
})
export class AppModule {}
