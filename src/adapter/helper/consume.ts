import * as amqp from "amqplib";
import { EventManagerError } from "../../lib/EventManagerError";
import {
  EventHandlerFunction,
  IEventManagerOptions
} from "../../lib/interfaces";
import { LOGGER } from "../../lib/logger";

interface IMessagesCountRetries {
  [k: string]: number;
}
const messagesCountRetries: IMessagesCountRetries = {};
export function consume(
  channel: amqp.Channel,
  queueName: string,
  listener: EventHandlerFunction,
  options: IEventManagerOptions
): Promise<boolean> {
  LOGGER.debug(`Consume messages of queue  ${queueName}`);
  return new Promise((resolve, reject) => {
    try {
      channel.consume(queueName, message => {
        LOGGER.debug(`Message received on queue  ${queueName}`);
        if (message) {
          try {
            const payload = JSON.parse(message.content.toString());
            const key = payload._metas.guid;
            if (
              message.fields.redelivered &&
              hasReachedMaxNumberOfRetries(
                key,
                options.maxNumberOfMessagesRetries
              )
            ) {
              LOGGER.warn(
                `Message with ${key} has been retried more than ${
                  options.maxNumberOfMessagesRetries
                } times, flushing ...`
              );
              flushMessage({ message, channel, key, options });
              reject(
                new EventManagerError(
                  `Message with ${key} has been retried more than ${
                    options.maxNumberOfMessagesRetries
                  } times`
                )
              );
            } else {
              const listenerInstance = listener(payload);
              if (listenerInstance instanceof Promise) {
                listenerInstance
                  .then(ok => {
                    if (ok || typeof ok === "undefined") {
                      acknowledgeMessage({ message, key, channel });
                      resolve(ok || ok === undefined);
                    } else {
                      requeueMessage({ message, key, channel });
                      reject(
                        new EventManagerError(
                          "Listener of event returned not true, so requeue message."
                        )
                      );
                    }
                  })
                  .catch(err => {
                    flushMessage({ message, channel, key, options });
                    reject(
                      new EventManagerError(
                        "Listener throws Error, message has been flushed",
                        err
                      )
                    );
                  });
              } else {
                // the listener does not return a promise so we need to acknowledge the message by default
                // Just set a warning
                LOGGER.warn(
                  `Listener of queue ${queueName} is not a Promise, all messages will be acknowledged by default`,
                  message
                );
                acknowledgeMessage({ message, channel, key });
                resolve(true);
              }
            }
          } catch (e) {
            LOGGER.debug(
              `Message unreadable, unable to parse JSON parsed on ${queueName}, flushing...`
            );
            flushMessage({
              message,
              channel,
              key: "unable to parse key",
              options
            });
            reject(new EventManagerError(`Error Parsing message`, e));
          }
        } else {
          reject(
            new EventManagerError(`Message received is null or not defined`)
          );
        }
      });
    } catch (e) {
      reject(new EventManagerError(`Error Consuming queue.`, e));
    }
  });
}

function hasReachedMaxNumberOfRetries(
  key: string,
  maxNumberOfMessagesRetries: number
) {
  return (
    messagesCountRetries[key] &&
    messagesCountRetries[key] >= maxNumberOfMessagesRetries
  );
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
  if (messagesCountRetries.hasOwnProperty(key)) {
    delete messagesCountRetries[key];
  }
  LOGGER.warn(`Message with guid ${key} has been flushed.`);
}

interface IAcknowledgeMessageParams {
  key: string;
  channel: amqp.Channel;
  message: amqp.ConsumeMessage;
}
function acknowledgeMessage(params: IAcknowledgeMessageParams) {
  const { key, channel, message } = params;
  LOGGER.debug("Message has been ackowledged");
  channel.ack(message);
  if (messagesCountRetries.hasOwnProperty(key)) {
    delete messagesCountRetries[key];
  }
}

interface IReqeueMessageParams {
  key: string;
  channel: amqp.Channel;
  message: amqp.ConsumeMessage;
}
function requeueMessage(params: IReqeueMessageParams) {
  const { key, channel, message } = params;
  LOGGER.debug(`Message has not been ackowledged and has be requeued`);
  if (!messagesCountRetries.hasOwnProperty(key)) {
    messagesCountRetries[key] = 0;
  }
  messagesCountRetries[key]++;
  channel.nack(message);
}
