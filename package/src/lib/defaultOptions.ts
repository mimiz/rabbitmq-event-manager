import { IEventManagerOptions } from "./interfaces";

export const defaultOptions: IEventManagerOptions = {
  url: "amqp://localhost",
  application: "application",
  metas: true,
  alternateExchangeName: "NO_QUEUE_EXCHANGE",
  alternateQueueName: "QUEUE_NO_QUEUE",
  deadLetterExchangeName: "DEAD_LETTER_EXCHANGE",
  deadLetterQueueName: "DEAD_LETTER_QUEUE",
  ttl: 1000 * 60 * 60 * 24, // 24 hours,
  maxNumberOfMessagesRetries: 10,
  logLevel: "error"
};
