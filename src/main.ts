import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { RedisIoAdapter } from './chat/redis.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // client 내 index.html 파일 경로 설정
  app.use(express.static(join(__dirname, '..', 'client')));

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();

  app.useWebSocketAdapter(redisIoAdapter);
  // 여기서 RedisIoAdapter 내 createIOServer 메소드 호출
  await app.listen(3000);
}
bootstrap();
