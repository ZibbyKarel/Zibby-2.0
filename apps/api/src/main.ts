import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: 'http://localhost:5173' }); // Vite dev server
  await app.listen(3001);
  console.log('API listening on http://localhost:3001');
}

bootstrap();
