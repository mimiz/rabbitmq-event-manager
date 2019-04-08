import * as amqp from "amqplib";
import { EventManagerError } from "../lib/EventManagerError";
import {
  EventHandlerFunction,
  IEventManagerOptions,
  IPayload
} from "../lib/interfaces";
import { LOGGER } from "../lib/logger";

let connection: amqp.Connection | null = null;
let channel: amqp.ConfirmChannel | null = null;

export async function connect(url: string): Promise<amqp.Connection> {
  try {
    if (connection === null) {
      connection = await amqp.connect(url);
    }
    return connection;
  } catch (e) {
    LOGGER.error("Unable to connect to RabbitMq Server");
    LOGGER.error(e);
    throw new EventManagerError(
      "[RABBITMQ] - Unable to connect to RabbitMq Server",
      e
    );
  }
}

export async function createChannel(url: string): Promise<amqp.ConfirmChannel> {
  try {
    if (channel === null) {
      const connection = await amqp.connect(url);
      channel = await connection.createConfirmChannel();
    }
    return channel;
  } catch (e) {
    LOGGER.error("Unable to create a channel on to RabbitMq Server");
    LOGGER.error(e);
    throw new EventManagerError(
      "[RABBITMQ] - Unable to create a channel on to RabbitMq Server"
    );
  }
}

export async function close(): Promise<void> {
  if (connection) {
    await connection.close();
  }
  return;
}

export async function createExchange(
  channel: amqp.ConfirmChannel,
  name: string,
  alternateExchangeName: string | null = null,
  options = { durable: true, autoDelete: false }
): Promise<string> {
  const exOptions: amqp.Options.AssertExchange = {
    durable: true,
    autoDelete: false,
    ...options
  };
  if (alternateExchangeName) {
    exOptions.alternateExchange = alternateExchangeName;
  }

  await channel.assertExchange(name, "fanout", exOptions);
  return name;
}

export function publish(
  channel: amqp.ConfirmChannel,
  exchangeName: string,
  payload: IPayload,
  options: IEventManagerOptions
): Promise<boolean> {
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
          LOGGER.error(err);
          reject(err);
        } else {
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
  const qOptions: any = {
    durable: true,
    autoDelete: false,
    ...options
  };

  await channel.assertQueue(queueName, qOptions);
  await channel.bindQueue(queueName, exchangeName, "");
  await channel.prefetch(1);
  return queueName;
}

export function consume(
  channel: amqp.Channel,
  queueName: string,
  listener: EventHandlerFunction,
  options: IEventManagerOptions
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      channel.consume(queueName, message => {
        if (message) {
          try {
            const payload = JSON.parse(message.content.toString());
            if (
              message.fields.deliveryTag > options.maxNumberOfMessagesRetries
            ) {
              channel.nack(message, false, false);
              reject(
                new EventManagerError(
                  `[RABBITMQ] - Event with id ${
                    payload._metas.guid
                  } has been retried more than ${
                    options.maxNumberOfMessagesRetries
                  }, so it's rejected`
                )
              );
            } else {
              const listenerInstance = listener(payload);
              if (listenerInstance instanceof Promise) {
                listenerInstance
                  .then(ok => {
                    if (ok) {
                      channel.ack(message);
                      resolve(ok);
                    } else {
                      channel.nack(message);
                      reject(
                        new EventManagerError(
                          "[RABBITMQ] - Listener of event returned not true."
                        )
                      );
                    }
                  })
                  .catch(err => {
                    /* if (err.message === EventErrorMessages.FLUSH) {
                                            channel.nack(message, false, false);
                                        } else {
                                            channel.nack(message);
                                        } */
                    channel.nack(message, false, false);
                    reject(
                      new EventManagerError(
                        "[RABBITMQ] - Listener throws Error",
                        err
                      )
                    );
                  });
              } else {
                // the listener does not return a promise so we need to acknowledge the message by default
                channel.ack(message);
                resolve(true);
              }
            }
          } catch (e) {
            channel.nack(message, false, false);
            reject(
              new EventManagerError(`[RABBITMQ] - Error Parsing message`, e)
            );
          }
        } else {
          reject(
            new EventManagerError(
              `[RABBITMQ] - Message received is null or not defined`
            )
          );
        }
      });
    } catch (e) {
      reject(new EventManagerError(`[RABBITMQ] - Error Consuming queue.`, e));
    }
  });
}
