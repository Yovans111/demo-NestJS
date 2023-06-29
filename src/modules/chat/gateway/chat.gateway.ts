import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { ChatService } from '../service/chat.service';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  constructor(private chatService: ChatService) { }

  @WebSocketServer() server: Server;

  handleDisconnect(client: any) {
    console.log(`Disconnected: ${client}`);

  }
  handleConnection(client: any, ...args: any[]) {
    console.log(`Connected ${client}`);
  }
  afterInit(server: any) {
    // console.log('AfterInit', server);
  }
  @SubscribeMessage('message')
  async handleMessage(client: any, payload: any): Promise<any> {
    console.log('handleMessage', client, payload);
    await this.chatService.createMessage(payload);
    this.server.emit('recMessage',payload);
  }
}
