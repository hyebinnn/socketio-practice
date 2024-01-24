import { IoAdapter } from '@nestjs/platform-socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private redisAdapter;

  constructor(app: any) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: `redis://localhost:6379` });
    const subClient = pubClient.duplicate();

    console.log('Start connect to redis...');

    pubClient.on('ready', () => {
      console.log('-----> Redis pubClient is ready!');
    });

    subClient.on('ready', () => {
      console.log('-----> Redis subClient is ready!');
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.redisAdapter = createAdapter(pubClient, subClient);
  }

  // app이 실행되면서 @nestjs/platform-socket.io 모듈이 IoAdapter를 초기화하고, createIOServer 메소드를 호출
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.redisAdapter);

    return server;
  }
}
