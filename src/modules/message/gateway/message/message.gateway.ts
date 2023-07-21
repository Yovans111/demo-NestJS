import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'mysql2/typings/mysql/lib/Server';
import { CreateMessageDTO } from '../../dto';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  }, path: "/my-message/"
})

export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server | any

  constructor() { }

  handleDisconnect(client: any) {
    console.log(`Disconnected: ${client.id}`);
  }
  handleConnection(client: any, ...args: any[]) {
    console.log(`Connected in Message ${client.id}`);
    // this.logger.log(`Socket connected: ${client.id}`)
  }

  @SubscribeMessage('message')
  async handleMessage(client: any, payload: CreateMessageDTO): Promise<any> {

    return
  }
}
