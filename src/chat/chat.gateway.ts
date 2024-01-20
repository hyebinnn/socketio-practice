// chat.gateway.ts : 클라이언트와 서버 간에 통신할 수 있도록 지원

import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // connectedClients는 클라이언트의 소켓 ID를 키로 사용하며, 해당 클라이언트가 연결되어 있는지 여부를 나타내는 boolean 값을 가지는 객체 (복수형 가능)
  connectedClients: { [socketId: string]: boolean } = {};
  clientNickname: { [socketId: string]: string } = {};
  roomUsers: { [key: string]: string[] } = {};

  handleConnection(client: Socket): void {
    if (this.connectedClients[client.id]) {
      client.disconnect(true);
      return;
    }
    this.connectedClients[client.id] = true;
  }

  handleDisconnect(client: Socket): void {
    delete this.connectedClients[client.id];

    // client 연결이 종료되면 해당 클라이언트가 속한 모든 방에서 해당 유저를 제거

    // roomUsers의 key들을(room 식별자) 순회하면서 해당 client 닉네임을 가진 index 추출 -> 해당 사용자가 없다면 null이 아닌 undefined 리턴 (-1)
    Object.keys(this.roomUsers).forEach((room) => {
      const index = this.roomUsers[room]?.indexOf(
        this.clientNickname[client.id],
      );
      if (index !== -1) {
        // 해당 닉네임을 room 배열에서 제거
        this.roomUsers[room].splice(index, 1);
        this.server
          .to(room)
          .emit('userLeft', { userId: this.clientNickname[client.id], room });
        // this.server
        //   .to(room)
        //   .emit('userList', { room, userList: this.roomUsers[room] });
      }
    });

    // 모든 방의 유저 목록을 업데이트하여 emit
    // why? -> delete 된 유저가 없던 방은 업데이트가 없었으니까
    Object.keys(this.roomUsers).forEach((room) => {
      this.server
        .to(room)
        .emit('userList', { room, userList: this.roomUsers[room] });
    });

    // 연결된 client 목록을 업데이트하여 emit
    this.server.emit('userList', {
      room: null,
      userList: Object.keys(this.connectedClients),
    });
  }

  @SubscribeMessage('getClientId')
  handleTransferClientId(client: Socket): void {
    this.server.emit('sendClientId', { clientId: client.id });
  }

  @SubscribeMessage('setUserNick')
  handleSetUserNick(client: Socket, nick: string): void {
    this.clientNickname[client.id] = nick;
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, room: string): void {
    // 이미 접속한 방인가?
    if (client.rooms.has(room)) {
      return;
    }
    console.log(this.clientNickname[client.id]);
    client.join(room);

    // room의 첫 유저라면, roomUsers[room] 배열 초기화
    if (!this.roomUsers[room]) {
      this.roomUsers[room] = [];
    }

    this.roomUsers[room].push(this.clientNickname[client.id]);
    this.server
      .to(room)
      .emit('userJoined', { userId: this.clientNickname[client.id], room });

    // 연결된 client 목록을 업데이트하여 emit
    this.server.emit('userList', {
      room: null,
      userList: Object.keys(this.connectedClients),
    });
  }

  @SubscribeMessage('exit')
  handleExit(client: Socket, room: string): void {
    // 이미 방에 접속되어있지 않은 상태면 무시
    if (!client.rooms.has(room)) {
      return;
    }

    client.leave(room);

    const index = this.roomUsers[room]?.indexOf(this.clientNickname[client.id]);
    if (index !== -1) {
      this.roomUsers[room].splice(index, -1);
      this.server
        .to(room)
        .emit('userLeft', { userId: this.clientNickname[client.id], room });
    }

    // 모든 방의 유저 목록을 업데이트하여 emit
    Object.keys(this.roomUsers).forEach((room) => {
      this.server
        .to(room)
        .emit('userList', { room, userList: this.roomUsers[room] });
    });

    // 연결된 client 목록을 업데이트하여 emit
    this.server.emit('userList', {
      room: null,
      userList: Object.keys(this.connectedClients),
    });
  }

  @SubscribeMessage('getUserList')
  handleFetUserList(client: Socket, room: string): void {
    this.server
      .to(room)
      .emit('userList', { room, userList: this.roomUsers[room] });
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(
    client: Socket,
    data: { message: string; room: string },
  ): void {
    // client 가 보낸 채팅 메시지를 해당 방으로 전달
    this.server.to(data.room).emit('chatMessage', {
      userId: this.clientNickname[client.id],
      message: data.message,
      room: data.room,
    });
  }
}
