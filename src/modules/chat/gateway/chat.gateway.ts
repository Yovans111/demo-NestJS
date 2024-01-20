import { Logger, UseGuards } from '@nestjs/common';
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Message, User_chat } from '../dto/chat/chat.interface';
import { Chat } from '../entity/chat.entity';
import { AzurecommunicationService } from '../service/azurecommunication/azurecommunication.service';
import { ChatService } from '../service/chat.service';
import { SocketGuard } from 'src/guards/socket/socket.guard';


@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  }
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  private logger = new Logger('gateway')
  constructor(private chatService: ChatService,private azureService:AzurecommunicationService) { }

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

  // @UseGuards(SocketGuard)
  @SubscribeMessage('sendMessage')
  async handleSendMessage(client: Socket, payload: Chat): Promise<void> {
    console.log('received',client.id,payload);
    // this.azureService.createChatThread();
    // this.azureService.createChatThread('Demo')
    // await this.chatService.createMessage(payload);
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
