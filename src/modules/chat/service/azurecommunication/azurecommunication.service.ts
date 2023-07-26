import { ChatClient, CreateChatThreadOptions } from '@azure/communication-chat';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { Injectable } from '@nestjs/common';
import { AccessToken, DefaultAzureCredential } from '@azure/identity';
import { CommunicationIdentityClient } from '@azure/communication-administration';
import { azureConfig } from 'src/layout/auth/constant';
import { RestError } from '@azure/storage-blob';


@Injectable()
export class AzurecommunicationService {
    private chatClient: ChatClient;

    constructor() {
        // this.getAccessToken()
        this.chatInitial();
    }
    chatInitial() {
        const chatServiceCredential = new AzureCommunicationTokenCredential(azureConfig.accessTokentemp)
        this.chatClient = new ChatClient(azureConfig.endpoint, chatServiceCredential);
        // this.createChatThread();
        const defaultAzureCredential = new DefaultAzureCredential();
        // const chatClient = new ChatClientBuilder()
        //     .endpoint('your_endpoint_url')
        //     .credential(defaultAzureCredential)
        //     .build();
    }

    async createChatThread(topic: any = 'Demo', participants?: any) {
        try {
            // const chatclient = await this.createChatClient()
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
                result = await this.chatClient.createChatThread(request),
                threadId = result?.chatThread.id;
            console.log('threadId', threadId)
            return threadId
        } catch (error) {
            if (error instanceof RestError) {
                console.error('Azure Communication Services Error:', error.message);
                console.error('Error Code:', error.code);

                // if (error.code === 400) {
                //   // Handle a bad request error (e.g., invalid payload)
                // }
            }
            console.error('Error Details:', error);
        }
    }

    async getAccessToken() {
        const { CommunicationIdentityClient } = require('@azure/communication-identity');
        const credential = new DefaultAzureCredential(),
            connectionString = azureConfig.connectionString,
            identityClient = new CommunicationIdentityClient(connectionString);
        let identityResponse = await identityClient.createUser();
        console.log(`\nCreated an identity with ID: ${identityResponse.communicationUserId}`);
        let tokenResponse = await identityClient.getToken(identityResponse, ["voip"]);
        const { token, expiresOn } = tokenResponse;
        // console.log(`\nIssued an access token with 'voip' scope that expires at ${expiresOn}:`);
        // console.log(token);
        azureConfig.accessTokentemp = await token;
        return token
    }
   

}
