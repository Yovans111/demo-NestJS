export interface User_chat {
    userId: string
    userName: string
    socketId: string
}

export interface Room {
    name: string
    host: User_chat
    users: User_chat[]
}

export interface Message {
    user: User_chat
    timeSent: string
    message: string
    roomName: string
}

export interface ServerToClientEvents {
    chat: (e: Message) => void
}

export interface ClientToServerEvents {
    chat: (e: Message) => void
    join_room: (e: { user: User_chat; roomName: string }) => void
}