import * as amqp from 'amqplib';
import { EventManagerError } from '../lib/EventManagerError';
import { EventHandlerFunction, IEventManagerOptions, IEventPayload } from '../lib/interfaces';
import { LOGGER } from '../lib/logger';

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
    LOGGER.error('Unable to connect to RabbitMq Server', e);
    throw new EventManagerError('Unable to connect to RabbitMq Server', e);
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
    LOGGER.error('Unable to create a channel on to RabbitMq Server', e);
    throw new EventManagerError('[RABBITMQ] - Unable to create a channel on to RabbitMq Server', e);
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
    ...options,
  };
  if (alternateExchangeName) {
    exOptions.alternateExchange = alternateExchangeName;
  }

  await channel.assertExchange(name, 'fanout', exOptions);
  LOGGER.info(`Echange ${name} created`);
  return name;
}

export function publish(channel: amqp.ConfirmChannel, exchangeName: string, payload: IEventPayload, options: IEventManagerOptions): Promise<IEventPayload> {
  LOGGER.debug(`Publish message to exchange ${exchangeName}`);
  return new Promise((resolve, reject) => {
    const stringPayload = JSON.stringify(payload);
    channel.publish(
      exchangeName,
      '',
      new Buffer(stringPayload),
      {
        persistent: true,
        appId: options.application,
        timestamp: payload._metas ? payload._metas.timestamp : Date.now(),
        messageId: payload._metas ? payload._metas.guid : '',
      },
      err => {
        if (err) {
          LOGGER.error('Unable to publish', err);
          reject(err);
        } else {
          LOGGER.info(`Message published to exchange ${exchangeName}`);
          LOGGER.debug('Message payload', payload);
          resolve(payload);
        }
      }
    );
  });
}

export async function createQueue(channel: amqp.ConfirmChannel, queueName: string, exchangeName: string, options?: amqp.Options.AssertQueue): Promise<string> {
  LOGGER.debug(`Create Queue ${queueName} binded to ${exchangeName}`);
  const qOptions: any = {
    durable: true,
    autoDelete: false,
    ...options,
  };

  await channel.assertQueue(queueName, qOptions);
  await channel.bindQueue(queueName, exchangeName, '');
  await channel.prefetch(1);
  LOGGER.debug(`Queue ${queueName} binded to ${exchangeName} Created`);
  return queueName;
}

export { consume } from './helper/consume';
export { deleteQueue } from './helper/deleteQueue';
export { deleteExchange } from './helper/deleteExchange';
