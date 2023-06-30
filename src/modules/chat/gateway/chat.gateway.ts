import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer, WsResponse } from '@nestjs/websockets';
import { ChatService } from '../service/chat.service';
import { Socket, Server } from 'socket.io';
import { Chat } from '../entity/chat.entity';
import { Observable, from, map } from 'rxjs';


@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  }, path: "/my-chat/"
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  constructor(private chatService: ChatService) { }

  @WebSocketServer() server: Server

  handleDisconnect(client: any) {
    console.log(`Disconnected: ${client.id}`);

  }
  handleConnection(client: any, ...args: any[]) {
    console.log(`Connected ${client.id}`);
  }
  afterInit(server: any) {
    // console.log('AfterInit', server);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(client: Socket, payload: Chat): Promise<void> {
    // console.log('re',payload)
    await this.chatService.createMessage(payload);
    this.server.emit('recMessage', payload);
  }



  // @SubscribeMessage('events')
  // findAll(@MessageBody() data: any): Observable<WsResponse<number>> {
  //   console.log('Call', data)
  //   return from([1, 2, 3]).pipe(map(item => ({ event: 'events', data: item })));
  // }

  // @SubscribeMessage('identity')
  // async identity(@MessageBody() data: number): Promise<number> {
  //   console.log('Call')
  //   return data;
  // }

}
