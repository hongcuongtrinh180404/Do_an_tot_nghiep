import { Channel, ConfirmChannel } from 'amqplib';
export declare const RABBITMQ_CONSTANTS: {
    EXCHANGE_TASKS: string;
    EXCHANGE_DEAD: string;
    QUEUE_AI: string;
    QUEUE_AI_DEAD: string;
    ROUTING_KEY_AI_DEAD: string;
    ROUTING_KEYS_AI: readonly ["ai.summary", "ai.quiz", "ai.mindmap"];
};
export declare function assertRabbitMqTopology(channel: Channel | ConfirmChannel): Promise<void>;
