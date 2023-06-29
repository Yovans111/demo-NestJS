import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat } from '../entity/chat.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChatService {

    constructor(
        @InjectRepository(Chat) private chatRepository: Repository<Chat>,
      ) {}

      async createMessage(chat: Chat): Promise<Chat> {
        return await this.chatRepository.save(chat);
      }
      
      async getMessages(): Promise<Chat[]> {
        return await this.chatRepository.find();
      }
}
