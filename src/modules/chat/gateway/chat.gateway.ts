import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Message, User_chat } from '../dto/chat/chat.interface';
import { Chat } from '../entity/chat.entity';
import { ChatService } from '../service/chat.service';
import { Logger } from '@nestjs/common';
import { MessageService } from 'src/modules/message/service/message.service';


@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  }, path: "/my-chat/"
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  private logger = new Logger('gateway')
  constructor(private chatService: ChatService) { }

  @WebSocketServer() server: Server | any

  handleDisconnect(client: any) {
    console.log(`Disconnected: ${client.id}`);
  }
  handleConnection(client: any, ...args: any[]) {
    console.log(`Connected ${client.id}`);
    // this.logger.log(`Socket connected: ${client.id}`)
  }
  afterInit(server: any) {
    // console.log('AfterInit', server);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(client: Socket, payload: Chat): Promise<void> {
    await this.chatService.createMessage(payload);
    this.server.emit('recMessage', payload);
  }


  //For Room Chat

  @SubscribeMessage('join_room')
  async handleSetClientDataEvent(client: Socket, payload: { roomName: string, user: User_chat }) {
    if (payload?.user.socketId) {
      console.log(`${payload.user.socketId} is joining ${payload.roomName}`)
      await this.server.in(payload.user.socketId).socketsJoin(payload.roomName)
      await this.chatService.addUserToRoom(payload.roomName, payload.user)
    }
  }

  @SubscribeMessage('chat')
  async handleChatEvent(@MessageBody() payload: Message): Promise<Message> {
    this.server.to(payload.roomName).emit('chat', payload) // broadcast messages
    return payload
  }

}
