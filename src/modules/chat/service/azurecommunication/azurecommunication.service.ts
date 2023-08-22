import { ChatClient, ChatThreadClient, CreateChatThreadOptions, SendMessageOptions ,} from '@azure/communication-chat';
import { AzureCommunicationTokenCredential, } from '@azure/communication-common';
import { Injectable } from '@nestjs/common';
import { AccessToken, DefaultAzureCredential, } from '@azure/identity';
import { azureConfig, } from 'src/layout/auth/constant';
import { RestError } from '@azure/storage-blob';
import { CommunicationIdentityClient, CommunicationUserToken, } from '@azure/communication-identity';


@Injectable()
export class AzurecommunicationService {
    private chatClient: ChatClient;
    userData: any;
    chatThreadClient: ChatThreadClient
    

    constructor() {
        // this.chatInitial();
    }
    chatInitial() {
        // const chatServiceCredential = new AzureCommunicationTokenCredential(azureConfig.accessTokentemp)
        // this.chatClient = new ChatClient(azureConfig.endpoint, chatServiceCredential);
        this.getUserToken(azureConfig.connectionString).then((data: any) => {
            const tokenCredential = new AzureCommunicationTokenCredential({
                tokenRefresher: async (abortSignal) => data.token,
            });
            this.chatClient = new ChatClient(azureConfig.endpoint, tokenCredential);
            this.createChatThread();
        })
    }

    private async getUserToken(connectionString: string): Promise<any> {
        const identityClient = new CommunicationIdentityClient(connectionString);
        const userToken = await identityClient.createUserAndToken(["chat"]);
        this.userData = userToken?.user;
        return { token: userToken?.token, userId: userToken?.user.communicationUserId };
    }

    async createChatThread(topic: any = 'Demo', participants?: any) {
        try {
            console.log('Azure Communication Chat client created')
            const request = { topic: topic },
                parti = [
                    {
                        id: { communicationUserId: '8:acs:4bc64146-f929-455d-8612-ec04679ca3f5_0000001a-2be5-dd73-78fe-343a0d005926' },
                        displayName: 'user-1'
                    },
                    {
                        id: { communicationUserId: '8:acs:4bc64146-f929-455d-8612-ec04679ca3f5_0000001a-2bee-aee1-35f3-343a0d002e92' },
                        displayName: 'user-2'
                    }
                ],
                options: CreateChatThreadOptions = { participants: parti },
                result = await this.chatClient.createChatThread(request, options),
                threadId = result?.chatThread.id
            this.chatThreadClient = await this.chatClient.getChatThreadClient(threadId || "");
            // this.sendMessage()
            // this.getChatThreadList()
            // this.receivedMessage()
            // console.log('threadId', threadId)
            return threadId
        } catch (error) {
            console.error('Error Details:', error.response);
        }
    }

    async sendMessage() {
        const Request = { content: 'Hello ! Can you share the deck for the conference?' },
            options: SendMessageOptions = {
                senderDisplayName: "Jack",
                type: 'text'
            };
        const sendChatMessageResult = await this.chatThreadClient.sendMessage(Request, options);
        const messageId = sendChatMessageResult.id;
        const messages = this.chatThreadClient.listMessages();
        for await (const message of messages) {
            console.log(`Chat Thread message :${message.content.message}`)
            const b = message.content?.participants
            if (Array.isArray(b)) {
                for (let a of b) {
                    // console.log(`Chat Thread message participant:${a.displayName}`);
                }
            }
        }
    }

    async receivedMessage() {
        // let lastReceivedTime = null;
        // while (true) {
        //     const messages = this.chatThreadClient.listMessages({ startTime: lastReceivedTime, maxPageSize: 10 });
        //     for await (const message of messages) {
        //         console.log(`Chat Thread message id:${message.content.message}`);
        //         lastReceivedTime = message.createdOn;
        //     }
        // await new Promise(resolve => setTimeout(resolve, 5000));
        // }
        // this.chatClient.startRealtimeNotifications();
        // this.chatClient.on("chatMessageReceived", async (e) => {
        //     console.log("Notification chatMessageReceived!", e);
        // });
    }
    async getChatThreadList() {
        const threads = this.chatClient.listChatThreads();
        for await (const thread of threads) {
            console.log(`Chat Thread item:${thread.id}`);
        }
    }
    async getAccessToken(connectionString: any): Promise<any> {
        const credential = new DefaultAzureCredential(),
            // connectionString = azureConfig.connectionString,
            identityClient = new CommunicationIdentityClient(connectionString);
        let identityResponse = await identityClient.createUser();
        console.log(`\nCreated an identity with ID: ${identityResponse.communicationUserId}`);
        let tokenResponse = await identityClient.getToken(identityResponse, ["voip"]);
        const { token, expiresOn } = tokenResponse;
        return { token: token, userId: identityResponse.communicationUserId }
    }


}
