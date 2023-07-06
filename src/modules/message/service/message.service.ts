import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateMessageDTO, MessageResponseDTO } from '../dto';
import { MessageEntity } from '../message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ChatGateway } from 'src/modules/chat/gateway/chat.gateway';
import { User } from 'src/modules/user/entity/user.entity';

@Injectable()
export class MessageService {

    constructor(
        @InjectRepository(MessageEntity)
        private messageRepository: Repository<MessageEntity>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @Inject(CACHE_MANAGER) private cacheManager,
        private gateway: ChatGateway
    ) { }

    async createMessage(data: CreateMessageDTO): Promise<MessageResponseDTO> {
        const { to, from } = data;
        await this.checkIfUsersExist(from, to);
        const message = this.messageRepository.create(data);
        const token = await this.getRecipientToken(to);
        const messageResponseObject = message.toResponseObject();
        if (token) {
            await this.gateway.server.emit(token, messageResponseObject);
        }
        message.delivered = true;
        message.seen = false;
        await this.messageRepository.save(message);
        return messageResponseObject;
    }

    private async getRecipientToken(email: string): Promise<boolean> {
        return this.cacheManager.get(email);
    }

    private async checkIfUsersExist(from: string, to: string): Promise<void> {
        if (!await this.userRepository.findOne({ where: { email_id: to } })) {
            throw new HttpException('Receiver of the message doesn\'t exist in the system', HttpStatus.BAD_REQUEST);
        }
        if (! await this.userRepository.findOne({ where: { email_id: from } })) {
            throw new HttpException('Sender of the message doesn\'t exist in the system', HttpStatus.BAD_REQUEST);
        }
    }
}

