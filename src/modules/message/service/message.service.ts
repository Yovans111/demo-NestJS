import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateMessageDTO, MessageResponseDTO, MessagesResponseDTO } from '../dto';
import { MessageEntity } from '../message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ChatGateway } from 'src/modules/chat/gateway/chat.gateway';
import { User } from 'src/modules/user/entity/user.entity';
import { paginate, Pagination, IPaginationOptions } from 'nestjs-typeorm-paginate';

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

    async getConversation(convoWith, user, options: IPaginationOptions): Promise<any> {
        const queryBuilder = this.messageRepository.createQueryBuilder('message');
        // All combination of from and to in of a message and when ordered by created date
        // gives you the entire conversation that belongs to two users.
        if (convoWith !== user) {
            queryBuilder
                .where('message.from = :from and message.to = :to or message.from = :to and message.to = :from', { from: user, to: convoWith })
                .orderBy('message.createdDate', 'ASC');
        } else {
            queryBuilder
                .where('message.from = :from and message.to = :to', { from: user, to: convoWith })
                .orderBy('message.createdDate', 'DESC');
        }
        const messages = await paginate<MessageEntity>(queryBuilder, options);

        const unseenCount = await this.messageRepository.countBy({
            from: convoWith,
            to: user,
            seen: false,
        });
        // Whenever conversations are retrieved we need to update the seen flag in the database indicating that
        // the messages have been seen by the user receiving it, since a request is being made to retrieve them.
        let seenCount = 0;
        if (messages.items) {
            for (const message of messages.items) {
                if (!message.seen) {
                    ++seenCount;
                    message.seen = true;
                    this.messageRepository.save(message);
                }
            }
        }
        const { items, itemCount, pageCount }: any = messages;
        const messagesResponseObject: MessagesResponseDTO = {
            items,
            itemCount,
            pageCount,
            unseenItems: Math.round(unseenCount - seenCount),
        };
        return { result: messagesResponseObject, statusCode: HttpStatus.OK, status: 'success' };
    }
}

