import { Module, OnModuleInit, OnModuleDestroy, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // Enable WAL mode for better concurrent read performance
    await this.$executeRawUnsafe('PRAGMA journal_mode=WAL;');
    await this.$executeRawUnsafe('PRAGMA foreign_keys=ON;');
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
