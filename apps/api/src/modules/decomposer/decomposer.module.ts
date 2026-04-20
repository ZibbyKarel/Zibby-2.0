import { Module } from '@nestjs/common';
import { DecomposerService } from './decomposer.service';

@Module({
  providers: [DecomposerService],
  exports: [DecomposerService],
})
export class DecomposerModule {}
