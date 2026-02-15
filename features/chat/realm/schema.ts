import { Realm } from '@realm/react';

export class Message extends Realm.Object<Message> {
    id!: string;
    conversationId!: string;
    text!: string;
    sender!: string; // 'me' | 'them'
    time!: string;
    status!: string; // 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
    isRead!: boolean;
    timestamp!: number;
    type!: string; // 'text' | 'image'
    serverId?: number; // i64 from server

    static schema: Realm.ObjectSchema = {
        name: 'Message',
        primaryKey: 'id',
        properties: {
            id: 'string',
            conversationId: { type: 'string', indexed: true },
            text: 'string',
            sender: 'string',
            time: 'string',
            status: 'string',
            isRead: { type: 'bool', default: false },
            timestamp: { type: 'int', indexed: true },
            type: { type: 'string', default: 'text' },
            serverId: { type: 'int', optional: true, indexed: true },
        },
    };
}

export class Conversation extends Realm.Object<Conversation> {
    id!: string;
    userId!: string; // Friend's user ID

    static schema: Realm.ObjectSchema = {
        name: 'Conversation',
        primaryKey: 'id',
        properties: {
            id: 'string',
            userId: { type: 'string', indexed: true },
        },
    };
}

export const ProcessedMessageSchema = {
    name: "ProcessedMessage",
    primaryKey: "id",
    properties: {
        id: "string", // Client message ID (deduplication)
        processedAt: "int"
    }
};

export const schemas = [Message, Conversation];
