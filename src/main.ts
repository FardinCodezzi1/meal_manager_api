import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter for consistent { error: message } response format
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS configuration
  app.enableCors({
    origin: '*',
    methods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 NestJS Meal Manager API server listening on http://0.0.0.0:${port}`);
  console.log(`📖 API Documentation available at http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
