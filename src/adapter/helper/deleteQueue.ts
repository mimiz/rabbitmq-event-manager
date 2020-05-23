import * as amqp from 'amqplib';
import { EventManagerError } from '../../lib/EventManagerError';
import { LOGGER } from '../../lib/logger';
export async function deleteQueue(channel: amqp.ConfirmChannel, queueName: string): Promise<void> {
  LOGGER.debug(`Delete Queue ${queueName}`);
  try {
    await channel.deleteQueue(queueName);
    LOGGER.debug(`Queue ${queueName} deleted`);
  } catch (err) {
    LOGGER.error(`Unable to delete queue ${queueName}`, err);
    throw new EventManagerError(`Unable to delete queue ${queueName}`, err);
  }
}
