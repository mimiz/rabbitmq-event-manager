import * as amqp from 'amqplib';
import { EventManagerError } from '../../lib/EventManagerError';
import { LOGGER } from '../../lib/logger';
export async function deleteExchange(channel: amqp.ConfirmChannel, exchangeName: string): Promise<void> {
  LOGGER.debug(`Delete Exchange ${exchangeName}`);
  try {
    await channel.deleteExchange(exchangeName);
    LOGGER.debug(`Exchange ${exchangeName} deleted`);
  } catch (err) {
    LOGGER.error(`Unable to delete Exchange ${exchangeName}`, err);
    throw new EventManagerError(`Unable to delete Exchange ${exchangeName}`, err);
  }
}
