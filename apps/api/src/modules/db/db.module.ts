import { Module, OnModuleInit, OnModuleDestroy, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // Enable WAL mode for better concurrent read performance
    await this.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await this.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DbModule {}
