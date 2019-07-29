import * as amqp from 'amqplib';
import { EventManagerError } from '../../lib/EventManagerError';
import { EventHandlerFunction, IEventManagerOptions, IEventPayload } from '../../lib/interfaces';
import { LOGGER } from '../../lib/logger';

export function consume(channel: amqp.Channel, queueName: string, listener: EventHandlerFunction, options: IEventManagerOptions): Promise<IEventPayload | void | null> {
  LOGGER.info(`Consume messages of queue  ${queueName}`);
  return new Promise((resolve, reject) => {
    try {
      console.log(queueName);
      channel.consume(queueName, message => {
        LOGGER.debug(`Message received on queue  ${queueName}`);
        if (message) {
          try {
            const payload = JSON.parse(message.content.toString());
            const key = payload._metas.guid;
            listener(payload)
              .then((response: IEventPayload | void | null) => {
                acknowledgeMessage({ message, key, channel });
                resolve(response);
              })
              .catch(err => {
                flushMessage({ message, channel, key, options });
                reject(new EventManagerError('Listener throws Error, message has been flushed', err));
              });
          } catch (e) {
            LOGGER.error(`Message unreadable, unable to parse JSON parsed on ${queueName}, flushing...`, { error: e });
            flushMessage({
              message,
              channel,
              key: 'unable to parse key',
              options,
            });
            reject(new EventManagerError(`Error Parsing message`, e));
          }
        } else {
          reject(new EventManagerError(`Message received is null or not defined`));
        }
      });
    } catch (e) {
      reject(new EventManagerError(`Error Consuming queue.`, e));
    }
  });
}

interface IFlushMessageParams {
  message: amqp.ConsumeMessage;
  channel: amqp.Channel;
  key: string;
  options: IEventManagerOptions;
}
/**
 * Helper function to make the consume method more readable
 */
function flushMessage(params: IFlushMessageParams) {
  const { channel, message, key, options } = params;
  channel.nack(message, false, false);
  LOGGER.warn(`Message with guid ${key} has been flushed.`);
}

interface IAcknowledgeMessageParams {
  key: string;
  channel: amqp.Channel;
  message: amqp.ConsumeMessage;
}
function acknowledgeMessage(params: IAcknowledgeMessageParams) {
  const { key, channel, message } = params;
  LOGGER.debug('Message has been ackowledged');
  channel.ack(message);
}
