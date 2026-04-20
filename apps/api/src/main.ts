import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const isProduction = process.env['NODE_ENV'] === 'production';
  if (!isProduction) {
    app.enableCors({ origin: 'http://localhost:5173' });
  }

  app.enableShutdownHooks();

  const port = Number(process.env['PORT'] ?? (isProduction ? 3000 : 3001));
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
