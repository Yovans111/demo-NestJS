import { ChatClient, CreateChatThreadOptions } from '@azure/communication-chat';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { Injectable } from '@nestjs/common';
import { azureConfig } from 'src/layout/auth/constant';

@Injectable()
export class AzurecommunicationService {
    private chatClient: ChatClient;

    constructor() {
        this.chatClient = new ChatClient(azureConfig.endpoint, new AzureCommunicationTokenCredential(azureConfig.connectionString));
    }

    async createChatThread(topic: any, participants: any) {
        const request = { topic: topic },
            options: CreateChatThreadOptions = { participants: participants },
            result = await this.chatClient.createChatThread(request, options),
            threadId = result?.chatThread.id;
        return threadId
    }
}
