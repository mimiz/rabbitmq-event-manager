import { ConfirmChannel } from 'amqplib';
import { v4 as uuid } from 'uuid';
import * as adapter from './adapter';
import { defaultOptions } from './lib/defaultOptions';
import { EventManagerError } from './lib/EventManagerError';
import { timeout } from './lib/helper';
import { EventHandlerFunction, IEmitAndWaitOptions, IEventManagerOptions, IEventPayload, IListenerOption, OverrideMetasFunction } from './lib/interfaces';
import { createLogger, LOGGER } from './lib/logger';

export class EventManager {
  private options: IEventManagerOptions;

  constructor(options?: Partial<IEventManagerOptions>) {
    this.options = { ...defaultOptions, ...options };
    this.createLogger();
    LOGGER.debug('Event Manager initialized');
  }

  private createLogger() {
    createLogger({
      prefix: this.options.logPrefix,
      level: this.options.logLevel,
      transportMode: this.options.logTransportMode,
    });
  }
  public async on(eventName: string, listener: EventHandlerFunction, options?: IListenerOption) {
    try {
      LOGGER.debug(`Listening ${eventName} Event ...`);
      const channel = await adapter.createChannel(this.options.url);
      const queueName = `${this.options.application}::${eventName}`;
      const exchangeName = await adapter.createExchange(channel, eventName, this.options.alternateExchangeName);

      await adapter.createQueue(channel, queueName, exchangeName, {
        messageTtl: options ? options.ttl : this.options.ttl,
        deadLetterExchange: options ? options.dlx : this.options.deadLetterExchangeName,
        arguments: {
          'x-dead-letter-routing-key': queueName,
        },
      });
      const newListener = (payload: IEventPayload): Promise<IEventPayload | void> => {
        return new Promise((resolve, reject) => {
          const listenerInstance = listener(payload);
          if (listenerInstance instanceof Promise) {
            listenerInstance
              .then(response => {
                return this.emitResponseIfNeeded(payload, response as any);
              })
              .then(res => resolve(res))
              .catch(err => reject(err));
          } else {
            this.emitResponseIfNeeded(payload, listenerInstance as any)
              .then(res => resolve(res))
              .catch(err => reject(err));
          }
        });
      };

      adapter.consume(channel, queueName, newListener, this.options);
      return;
    } catch (e) {
      LOGGER.error(`Unable to listen event ${eventName}`, e);
      throw new EventManagerError(`Unable to listen event ${eventName}`, e);
    }
  }
  public async emit(eventName: string, payload: IEventPayload): Promise<IEventPayload> {
    try {
      LOGGER.info(`Emitting ${eventName} Message ...`);
      LOGGER.debug(`Event ${eventName}, payload received`, { payload });
      // we should create the metas information here
      payload = this.addMetasToPayload(payload, eventName);
      LOGGER.debug(`Event ${eventName}, payload emitted`, { payload });
      const channel = await adapter.createChannel(this.options.url);

      await adapter.createExchange(channel, eventName, this.options.alternateExchangeName);
      const returnedPayload = await adapter.publish(channel, eventName, payload, this.options);

      LOGGER.debug(`Message ${eventName} Emitted`);
      return returnedPayload;
    } catch (err) {
      LOGGER.error(err);
      throw new EventManagerError(`Unable to emit event ${eventName}`, err);
    }
  }

  public async emitAndWait(eventName: string, payload: IEventPayload, replyToName?: string, options?: IEmitAndWaitOptions): Promise<IEventPayload> {
    return new Promise(async (resolve, reject) => {
      LOGGER.info(`Emitting ${eventName} Message and waiting ...`);
      LOGGER.debug(`Event ${eventName}, payload received`, { payload, replyToName });
      let replyTo = replyToName ? replyToName : `${eventName}${this.options.defaultResponseSuffix}`;
      const correlationId = uuid();
      replyTo += `.${correlationId}`;
      const overrideMetas = payload._metas
        ? {
            correlationId,
            replyTo,
            ...payload._metas,
          }
        : {
            correlationId,
            replyTo,
          };
      const newPayload = {
        ...payload,
      };
      newPayload._metas = overrideMetas;

      const listen = () => {
        return new Promise(resolve => {
          this.on(replyTo, (responsePayload: IEventPayload) => {
            resolve(responsePayload);
          });
        });
      };

      const duration = options && options.emitAndWaitTimeout ? options.emitAndWaitTimeout : this.options.emitAndWaitTimeout;
      const timeoutMessage = `Timeout Error after ${duration} milliseconds for event ${eventName} and correlationId ${correlationId} `;

      let channel: ConfirmChannel;
      let queueName: string;
      Promise.race([timeout(duration, timeoutMessage), listen()])
        .then(async (payload: any) => {
          channel = await adapter.createChannel(this.options.url);
          queueName = `${this.options.application}::${replyTo}`;
          await adapter.deleteQueue(channel, queueName);
          await adapter.deleteExchange(channel, replyTo);
          resolve(payload);
        })
        .catch(() => {
          setImmediate(async () => {
            if (channel) {
              await adapter.deleteQueue(channel, queueName);
              await adapter.deleteExchange(channel, replyTo);
            }
          });
          reject();
        });
      const payloadEmitted = await this.emit(eventName, newPayload);
      LOGGER.info(`EmitAndWait : ${eventName}`, { payload: payloadEmitted });
    });
  }

  public async initialize() {
    try {
      LOGGER.debug(`Initializing EventManager`, { ...this.options });
      const channel = await adapter.createChannel(this.options.url);
      // Create Alternate
      await adapter.createExchange(channel, this.options.alternateExchangeName);
      await adapter.createQueue(channel, this.options.alternateQueueName, this.options.alternateExchangeName);
      // Create Dead Letter
      await adapter.createExchange(channel, this.options.deadLetterExchangeName);
      await adapter.createQueue(channel, this.options.deadLetterQueueName, this.options.deadLetterExchangeName);
    } catch (err) {
      throw new EventManagerError('Error Initializing Event Manager', err);
    }
  }
  public async close() {
    LOGGER.debug(`Disconnect EventManager`, { ...this.options });
    return adapter.disconnect();
  }

  private addMetasToPayload(payload: IEventPayload, eventName: string): IEventPayload {
    if (!this.options.metas) {
      return payload;
    } else {
      const metasOverride = payload._metas ? payload._metas : {};

      const metas = {
        guid: uuid(),
        name: eventName,
        application: this.options.application,
        timestamp: Date.now(),
        ...metasOverride,
      };

      if (isOverrideMetasFunction(this.options.metas)) {
        return { ...payload, _metas: this.options.metas(metas) };
      } else {
        return { ...payload, _metas: metas };
      }
    }
  }

  private async emitResponseIfNeeded(sourcePayload: IEventPayload, targetPayload: IEventPayload): Promise<IEventPayload | void> {
    if (
      sourcePayload &&
      sourcePayload._metas &&
      sourcePayload._metas.correlationId &&
      sourcePayload._metas.replyTo &&
      targetPayload !== null &&
      typeof targetPayload === 'object'
    ) {
      const newPayload = {
        _metas: {
          responseTo: sourcePayload._metas.name,
          correlationId: sourcePayload._metas.correlationId,
        },
        ...targetPayload,
      };

      return this.emit(sourcePayload._metas.replyTo, newPayload);
    }
  }
}

function isOverrideMetasFunction(func: any): func is OverrideMetasFunction {
  return {}.toString.call(func) === '[object Function]';
}
