import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import exp from 'constants';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // client 내 index.html 파일 경로 설정
  app.use(express.static(join(__dirname, '..', 'client')));

  await app.listen(3000);
}
bootstrap();
