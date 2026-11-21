export const RABBITMQ_CONSTANTS = {
    EXCHANGE_TASKS: 'mindly.tasks.v1',
    EXCHANGE_DEAD: 'mindly.dead.v1',
    QUEUE_AI: 'mindly.ai.v1',
    QUEUE_AI_DEAD: 'mindly.ai.dead.v1',
    ROUTING_KEY_AI_DEAD: 'dead.ai',
    ROUTING_KEYS_AI: ['ai.summary', 'ai.quiz', 'ai.mindmap'],
};
export async function assertRabbitMqTopology(channel) {
    await channel.assertExchange(RABBITMQ_CONSTANTS.EXCHANGE_TASKS, 'direct', {
        durable: true,
    });
    await channel.assertExchange(RABBITMQ_CONSTANTS.EXCHANGE_DEAD, 'direct', {
        durable: true,
    });
    await channel.assertQueue(RABBITMQ_CONSTANTS.QUEUE_AI_DEAD, {
        durable: true,
    });
    await channel.bindQueue(RABBITMQ_CONSTANTS.QUEUE_AI_DEAD, RABBITMQ_CONSTANTS.EXCHANGE_DEAD, RABBITMQ_CONSTANTS.ROUTING_KEY_AI_DEAD);
    await channel.assertQueue(RABBITMQ_CONSTANTS.QUEUE_AI, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': RABBITMQ_CONSTANTS.EXCHANGE_DEAD,
            'x-dead-letter-routing-key': RABBITMQ_CONSTANTS.ROUTING_KEY_AI_DEAD,
        },
    });
    for (const routingKey of RABBITMQ_CONSTANTS.ROUTING_KEYS_AI) {
        await channel.bindQueue(RABBITMQ_CONSTANTS.QUEUE_AI, RABBITMQ_CONSTANTS.EXCHANGE_TASKS, routingKey);
    }
}
//# sourceMappingURL=rabbitmq-topology.js.map