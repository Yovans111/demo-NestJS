import { ChatClient, ChatParticipant, ChatThreadClient, CreateChatThreadOptions, SendMessageOptions, } from '@azure/communication-chat';
import { AzureCommunicationTokenCredential, CommunicationUserIdentifier, } from '@azure/communication-common';
import { CommunicationIdentityClient } from '@azure/communication-identity';
import { Injectable } from '@nestjs/common';
import { azureConfig, } from 'src/layout/auth/constant';


@Injectable()
export class AzurecommunicationService {
    azureConfig = {
        connectionString: "endpoint=https://az-comm-svcs-4-apis.communication.azure.com/;accesskey=dX1zBVg8ezXQ2m5fzzLt7xWKmzs5HGOgR3etkIpJ9UZjQz58VJAEcepUaUwxyNEWYdheGMEPMRBql4PfqD4roA==",
        endpoint: 'https://az-comm-svcs-4-apis.communication.azure.com/',
    };
    private chatClient: ChatClient;
    userData: any;
    chatThreadClient: ChatThreadClient;
    userId = '8:acs:4bc64146-f929-455d-8612-ec04679ca3f5_0000001e-2739-0ac1-e3c7-593a0d00751d';
    private identityClient = new CommunicationIdentityClient(this.azureConfig.connectionString);



    constructor() { }
    async chatInitial() {
        //for create new user and get accsess token 
        this.createUser()

        // get access token  for exist user
        this.getToken()

    }

    createUser() {
        this.createUserAndToken().then((data: any) => {
            console.log('user data', data)
            const tokenCredential = new AzureCommunicationTokenCredential({
                tokenRefresher: async (abortSignal) => data.token,
            });
            this.chatClient = new ChatClient(this.azureConfig.endpoint, tokenCredential);
        })
    }

    getToken() {
        this.getTokenByUserId(this.userId).then(async (data: any) => {
            const tokenCredential = new AzureCommunicationTokenCredential({
                tokenRefresher: async (abortSignal) => data.token,
            });
            this.chatClient = new ChatClient(this.azureConfig.endpoint, tokenCredential);
        })
    }

    private async createUserAndToken(): Promise<any> {
        const userToken = await this.identityClient.createUserAndToken(["chat"]);
        this.userData = userToken?.user;
        return { token: userToken?.token, userId: userToken?.user.communicationUserId };
    }
    private async getTokenByUserId(userId: string): Promise<any> {
        const user: CommunicationUserIdentifier = { communicationUserId: userId };
        const userToken = await this.identityClient.getToken(user, ['chat']);
        return { token: userToken?.token, userId: user.communicationUserId };
    }


    async createChatThread(topic: any = 'Demo', participants?: ChatParticipant[]) {
        try {
            const request = { topic: topic };
            participants = [
                {
                    id: { communicationUserId: '8:acs:4bc64146-f929-455d-8612-ec04679ca3f5_0000001e-2733-34d5-28c5-593a0d008618' },
                    displayName: 'Vans'
                },
                {
                    id: { communicationUserId: '8:acs:4bc64146-f929-455d-8612-ec04679ca3f5_0000001e-2733-a6a0-f883-084822007949' },
                    displayName: 'Vinoth'
                }
            ];
            const options: CreateChatThreadOptions = { participants: participants },
                result = await this.chatClient.createChatThread(request, options),
                threadId = result?.chatThread.id
            this.chatThreadClient = await this.chatClient.getChatThreadClient(threadId || "");
            console.log('threadId', threadId)
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
        return messageId
    }

    async receivedMessage() {
        // let lastReceivedTime = null;
        // while (true) {
        //     const messages = this.chatThreadClient.listMessages({ startTime: lastReceivedTime, maxPageSize: 10 });
        //     for await (const message of messages) {
        //         console.log(`Chat Thread message id:${message.content.message}`);
        //         lastReceivedTime = message.createdOn;
        //     }
        //     await new Promise(resolve => setTimeout(resolve, 5000));
        // }
        this.chatClient.startRealtimeNotifications();
        this.chatClient.on("chatMessageReceived", async (e) => {
            console.log("Notification chatMessageReceived!", e);
        });
    }
    async getChatThreadList() {
        const threads = await this.chatClient.listChatThreads();
        for await (const thread of threads) {
            console.log(`Chat Thread item:${thread.id}`);
        }
    }

    async getListMessage() {
        const messages = this.chatThreadClient.listMessages();
        for await (const message of messages) {
            console.log(`Chat Thread message :${message.content.message}`)
            const b = message.content?.participants
            if (Array.isArray(b)) {
                for (let a of b) {
                    console.log(`Chat Thread message participant:${a.displayName}`);
                }
            }
        }
    }


    // async createUserandToken(connectionString: any): Promise<any> {
    //     const credential = new DefaultAzureCredential(),
    //         // connectionString = azureConfig.connectionString,
    //         identityClient = new CommunicationIdentityClient(connectionString);
    //     let identityResponse = await identityClient.createUser();
    //     console.log(`\nCreated an identity with ID: ${identityResponse.communicationUserId}`);
    //     let tokenResponse = await identityClient.getToken(identityResponse, ["voip"]);
    //     const { token, expiresOn } = tokenResponse;
    //     return { token: token, userId: identityResponse.communicationUserId }
    // }


}


//test users
// user1
//  {
//   token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjYwNUVCMzFEMzBBMjBEQkRBNTMxODU2MkM4QTM2RDFCMzIyMkE2MTkiLCJ4NXQiOiJZRjZ6SFRDaURiMmxNWVZpeUtOdEd6SWlwaGsiLCJ0eXAiOiJKV1QifQ.eyJza3lwZWlkIjoiYWNzOjRiYzY0MTQ2LWY5MjktNDU1ZC04NjEyLWVjMDQ2NzljYTNmNV8wMDAwMDAxZS0yNzMzLTM0ZDUtMjhjNS01OTNhMGQwMDg2MTgiLCJzY3AiOjE3OTIsImNzaSI6IjE3MDczNzIyODYiLCJleHAiOjE3MDc0NTg2ODYsInJnbiI6ImFtZXIiLCJhY3NTY29wZSI6ImNoYXQiLCJyZXNvdXJjZUlkIjoiNGJjNjQxNDYtZjkyOS00NTVkLTg2MTItZWMwNDY3OWNhM2Y1IiwicmVzb3VyY2VMb2NhdGlvbiI6InVuaXRlZHN0YXRlcyIsImlhdCI6MTcwNzM3MjI4Nn0.ij1DOrVKtZPnAJ4ynyiviJdOmpTwNNSdHv5vfTj3dzzhVEe-N8iJdeuxWNDB5vG2iDWNxlfZmvcoOZ64uv__xzSsUfRp280tfhKwCfD5XHqMrjkGx8spnkDEhfUQ-xSe_xlFLghiqWbGkkJyk_GCdgMS0xS2Cbpm4wRAytS9XN_HnzyfS-h-Ij-WheEUtPKsUvKD8THveoEtkMgSSuwpK4nsag0eOQprGZru-v4XPZabjnfDbydgYn8epYI_lwQ4s-x30VbdO3klI1Hs5V5ZrWk4NZjW1720ZDZLYF3YCTCasElJL5FdDGK0Yh1jwklzspu75J2z5VawbijJdAEVSg',
//   userId: '8:acs:4bc64146-f929-455d-8612-ec04679ca3f5_0000001e-2733-34d5-28c5-593a0d008618'
// }


// user2
//  {
//   token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjYwNUVCMzFEMzBBMjBEQkRBNTMxODU2MkM4QTM2RDFCMzIyMkE2MTkiLCJ4NXQiOiJZRjZ6SFRDaURiMmxNWVZpeUtOdEd6SWlwaGsiLCJ0eXAiOiJKV1QifQ.eyJza3lwZWlkIjoiYWNzOjRiYzY0MTQ2LWY5MjktNDU1ZC04NjEyLWVjMDQ2NzljYTNmNV8wMDAwMDAxZS0yNzMzLWE2YTAtZjg4My0wODQ4MjIwMDc5NDkiLCJzY3AiOjE3OTIsImNzaSI6IjE3MDczNzIzMTUiLCJleHAiOjE3MDc0NTg3MTUsInJnbiI6ImFtZXIiLCJhY3NTY29wZSI6ImNoYXQiLCJyZXNvdXJjZUlkIjoiNGJjNjQxNDYtZjkyOS00NTVkLTg2MTItZWMwNDY3OWNhM2Y1IiwicmVzb3VyY2VMb2NhdGlvbiI6InVuaXRlZHN0YXRlcyIsImlhdCI6MTcwNzM3MjMxNX0.OY3ig4-pESEn72LscQK57Ih1XQdSt3dvP4H81Wc5dO17AOgQl5cZYeO-MfDw8mS-0mSlfogxdc7YKeNOwP_TdK-ecpXRUXwY0uG8H8xAFCEjVQlVNitX-AeE6_3gIIUmrIT3r70QNy33WX3wqC6PcDCFSILR5U4r1pgPy6fXSdG0fwaLJ6-6rYZslXuk9qQDZWzelH_2v2g5Gu7I7mXqiWp7SuGYdIJvNYhh0e11xbhUvCIwjdE-RHrT24uClQfhocFznhPLs8CY73RL1TebhisEhhbvlUGIe-Zi06ttzWwZlk5Rbbo-RKQUNvxTmKxuALi4ztwe0Bc93ReynxnK9A',
//   userId: '8:acs:4bc64146-f929-455d-8612-ec04679ca3f5_0000001e-2733-a6a0-f883-084822007949'
// }

// user 3
//  {
//   token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjYwNUVCMzFEMzBBMjBEQkRBNTMxODU2MkM4QTM2RDFCMzIyMkE2MTkiLCJ4NXQiOiJZRjZ6SFRDaURiMmxNWVZpeUtOdEd6SWlwaGsiLCJ0eXAiOiJKV1QifQ.eyJza3lwZWlkIjoiYWNzOjRiYzY0MTQ2LWY5MjktNDU1ZC04NjEyLWVjMDQ2NzljYTNmNV8wMDAwMDAxZS0yNzM5LTBhYzEtZTNjNy01OTNhMGQwMDc1MWQiLCJzY3AiOjE3OTIsImNzaSI6IjE3MDczNzI2NjgiLCJleHAiOjE3MDc0NTkwNjgsInJnbiI6ImFtZXIiLCJhY3NTY29wZSI6ImNoYXQiLCJyZXNvdXJjZUlkIjoiNGJjNjQxNDYtZjkyOS00NTVkLTg2MTItZWMwNDY3OWNhM2Y1IiwicmVzb3VyY2VMb2NhdGlvbiI6InVuaXRlZHN0YXRlcyIsImlhdCI6MTcwNzM3MjY2OH0.L3w7wf0p8defDXx3WlljFOdPsAhcoG-tyCBIAzSDzzZpt1pCQDqoZ-mMk0m6JSCvZe_pjmnfHTWLroJt329fPHIF7RjnDrYdc8DaaYmPVuVzosd9MGdWIMNlkofsColKqBuBoAhCqH8X5PBVPtwEoWhjwttwuYGnrt8YdgCb972Io2lK0reY0obZyPCp3COWa2_k5AscGxnoAC4x8AK9d1cjw8ZcHTWRs-s9aMBdndcqg8Ffjt1Mvh1J9i8v0Ys60nDXJ9Nfr_NuSIdfh3g6ZJd7PK5kJ_bt1-vc3--FkNo2VNetzcUv3P-oKkVaUY-56Ty-lCR9TIfjaFMEIbEbFg',
//   userId: '8:acs:4bc64146-f929-455d-8612-ec04679ca3f5_0000001e-2739-0ac1-e3c7-593a0d00751d'
// }

// user 4
//  {
//   token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjYwNUVCMzFEMzBBMjBEQkRBNTMxODU2MkM4QTM2RDFCMzIyMkE2MTkiLCJ4NXQiOiJZRjZ6SFRDaURiMmxNWVZpeUtOdEd6SWlwaGsiLCJ0eXAiOiJKV1QifQ.eyJza3lwZWlkIjoiYWNzOjRiYzY0MTQ2LWY5MjktNDU1ZC04NjEyLWVjMDQ2NzljYTNmNV8wMDAwMDAxZS0yNzM5LWYzMjMtZWM4ZC0wODQ4MjIwMDdmZjIiLCJzY3AiOjE3OTIsImNzaSI6IjE3MDczNzI3MjgiLCJleHAiOjE3MDc0NTkxMjgsInJnbiI6ImFtZXIiLCJhY3NTY29wZSI6ImNoYXQiLCJyZXNvdXJjZUlkIjoiNGJjNjQxNDYtZjkyOS00NTVkLTg2MTItZWMwNDY3OWNhM2Y1IiwicmVzb3VyY2VMb2NhdGlvbiI6InVuaXRlZHN0YXRlcyIsImlhdCI6MTcwNzM3MjcyOH0.eYPwhH2QTgrUtofO6dC1idlI1ChYkfF3qRBpbunVXKWBI1nQm4c59QgwtNtlpyuywN09zA3iCDA-A1qkH-7ZVrQ4NOw73o3ztS5qLReMLjdAB3ihvZKhWBbOSy3wRv3VKgyFfZkIACgib3vsBH7WjoCJWFHDJrahVLY4SJUj7QJj5T1bYlkBcqwubF38SCd1atBIN9WQDD0DzPHh-7ZSlTu_mkAzl_l-DYP0HwiMziNyhMlEzYBOsUoVA9oOtP_3CPwn6q4_4hdYA1PNcMHONw3bbHpuHCMhYC_yrX8_14V8gqpVMBmAOzWUXVcKR4mSR2kBaPyivL84ygD66XYS7A',
//   userId: '8:acs:4bc64146-f929-455d-8612-ec04679ca3f5_0000001e-2739-f323-ec8d-084822007ff2'
// }
