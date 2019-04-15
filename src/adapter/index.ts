import * as amqp from "amqplib";
import { EventManagerError } from "../lib/EventManagerError";
import {
  EventHandlerFunction,
  IEventManagerOptions,
  IEventPayload
} from "../lib/interfaces";
import { LOGGER } from "../lib/logger";

let connection: amqp.Connection | null = null;
let channel: amqp.ConfirmChannel | null = null;

/**
 * Connect to the rabbitMQ server.
 *
 * @param url The url of the RabbitMQ Server (including crentials and vhosts)
 */
export async function connect(url: string): Promise<amqp.Connection> {
  try {
    LOGGER.debug(`Connect to RabbitMQ server on ${url}`);
    if (connection === null) {
      connection = await amqp.connect(url);
    }
    return connection;
  } catch (e) {
    LOGGER.error("Unable to connect to RabbitMq Server", e);
    throw new EventManagerError("Unable to connect to RabbitMq Server", e);
  }
}

/**
 * Disconnect everything from RabbitMQ
 */
export async function disconnect(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}
export async function createChannel(url: string): Promise<amqp.ConfirmChannel> {
  try {
    LOGGER.debug(`Create Channel on ${url}`);
    if (channel === null) {
      const connection = await amqp.connect(url);
      channel = await connection.createConfirmChannel();
    }
    LOGGER.info(`Channel Created on ${url}`);
    return channel;
  } catch (e) {
    LOGGER.error("Unable to create a channel on to RabbitMq Server", e);
    throw new EventManagerError(
      "[RABBITMQ] - Unable to create a channel on to RabbitMq Server",
      e
    );
  }
}

export async function createExchange(
  channel: amqp.ConfirmChannel,
  name: string,
  alternateExchangeName: string | null = null,
  options = { durable: true, autoDelete: false }
): Promise<string> {
  LOGGER.debug(`Create Exchange ${name}`);
  const exOptions: amqp.Options.AssertExchange = {
    durable: true,
    autoDelete: false,
    ...options
  };
  if (alternateExchangeName) {
    exOptions.alternateExchange = alternateExchangeName;
  }

  await channel.assertExchange(name, "fanout", exOptions);
  LOGGER.info(`Echange ${name} created`);
  return name;
}

export function publish(
  channel: amqp.ConfirmChannel,
  exchangeName: string,
  payload: IEventPayload,
  options: IEventManagerOptions
): Promise<boolean> {
  LOGGER.debug(`Publish message to exchange ${exchangeName}`);
  return new Promise((resolve, reject) => {
    const stringPayload = JSON.stringify(payload);
    channel.publish(
      exchangeName,
      "",
      new Buffer(stringPayload),
      {
        persistent: true,
        appId: options.application,
        timestamp: payload._metas ? payload._metas.timestamp : Date.now(),
        messageId: payload._metas ? payload._metas.guid : ""
      },
      err => {
        if (err) {
          LOGGER.error("Unable to publish", err);
          reject(err);
        } else {
          LOGGER.info(`Message published to exchange ${exchangeName}`);
          LOGGER.debug("Message payload", payload);
          resolve(true);
        }
      }
    );
  });
}

export async function createQueue(
  channel: amqp.ConfirmChannel,
  queueName: string,
  exchangeName: string,
  options?: amqp.Options.AssertQueue
): Promise<string> {
  LOGGER.debug(`Create Queue ${queueName} binded to ${exchangeName}`);
  const qOptions: any = {
    durable: true,
    autoDelete: false,
    ...options
  };

  await channel.assertQueue(queueName, qOptions);
  await channel.bindQueue(queueName, exchangeName, "");
  await channel.prefetch(1);
  LOGGER.debug(`Queue ${queueName} binded to ${exchangeName} Created`);
  return queueName;
}

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
            if (
              message.fields.deliveryTag > options.maxNumberOfMessagesRetries
            ) {
              channel.nack(message, false, false);
              const id = payload._metas.guid;
              const max = options.maxNumberOfMessagesRetries;
              LOGGER.warn(
                `Message has been flushed, after ${
                  options.maxNumberOfMessagesRetries
                } times requeued.`
              );
              reject(
                new EventManagerError(
                  `Event with ${id} has been retried more than ${max} times`
                )
              );
            } else {
              const listenerInstance = listener(payload);
              if (listenerInstance instanceof Promise) {
                listenerInstance
                  .then(ok => {
                    if (ok || typeof ok === "undefined") {
                      LOGGER.debug("Message has been ackowledged");
                      channel.ack(message);
                      resolve(ok || ok === undefined);
                    } else {
                      LOGGER.debug(
                        `Message has not been ackowledged and has be requeued`
                      );
                      channel.nack(message);
                      reject(
                        new EventManagerError(
                          "Listener of event returned not true, so requeue message."
                        )
                      );
                    }
                  })
                  .catch(err => {
                    LOGGER.debug(
                      `Message has not been ackowledged and has be flushed`
                    );
                    channel.nack(message, false, false);
                    reject(new EventManagerError("Listener throws Error", err));
                  });
              } else {
                LOGGER.warn(
                  `Listener of queue ${queueName} is not a Promise, all messages will be acknowledged by default`,
                  message
                );
                // the listener does not return a promise so we need to acknowledge the message by default
                channel.ack(message);
                resolve(true);
              }
            }
          } catch (e) {
            LOGGER.debug(
              `Message has been flushed cause unable to be JSON parsed on ${queueName}`
            );
            channel.nack(message, false, false);
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
