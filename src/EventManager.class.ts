import { v4 as uuid } from "uuid";
import * as adapter from "./adapter";
import { defaultOptions } from "./lib/defaultOptions";
import { EventManagerError } from "./lib/EventManagerError";
import {
  EventHandlerFunction,
  IEventManagerOptions,
  IEventPayload,
  OverrideMetasFunction
} from "./lib/interfaces";
import { createLogger, LOGGER } from "./lib/logger";

export class EventManager {
  private options: IEventManagerOptions;

  constructor(options?: Partial<IEventManagerOptions>) {
    this.options = { ...defaultOptions, ...options };
    this.createLogger();
  }

  private createLogger() {
    createLogger({
      prefix: this.options.logPrefix,
      level: this.options.logLevel,
      transportMode: this.options.logTransportMode
    });
  }
  public async on(eventName: string, listener: EventHandlerFunction) {
    try {
      const channel = await adapter.createChannel(this.options.url);
      const queueName = `${this.options.application}::${eventName}`;
      const exchangeName = await adapter.createExchange(
        channel,
        eventName,
        this.options.alternateExchangeName
      );

      await adapter.createQueue(channel, queueName, exchangeName, {
        messageTtl: this.options.ttl,
        deadLetterExchange: this.options.deadLetterExchangeName,
        arguments: {
          "x-dead-letter-routing-key": queueName
        }
      });
      await adapter.consume(channel, queueName, listener, this.options);
    } catch (e) {
      LOGGER.error(`Unable to listen event ${eventName}`, e);
      throw new EventManagerError(`Unable to listen event ${eventName}`, e);
    }
  }
  public async emit(eventName: string, payload: IEventPayload): Promise<void> {
    try {
      // we should create the metas information here
      payload = this.addMetasToPayload(payload, eventName);
      const channel = await adapter.createChannel(this.options.url);
      await adapter.createExchange(
        channel,
        eventName,
        this.options.alternateExchangeName
      );
      await adapter.publish(channel, eventName, payload, this.options);
      return;
    } catch (err) {
      throw new EventManagerError(`Unable to emit event ${eventName}`, err);
    }
  }

  public async initialize() {
    try {
      const channel = await adapter.createChannel(this.options.url);
      // Create Alternate
      await adapter.createExchange(channel, this.options.alternateExchangeName);
      await adapter.createQueue(
        channel,
        this.options.alternateQueueName,
        this.options.alternateExchangeName
      );
      // Create Dead Letter
      await adapter.createExchange(
        channel,
        this.options.deadLetterExchangeName
      );
      await adapter.createQueue(
        channel,
        this.options.deadLetterQueueName,
        this.options.deadLetterExchangeName
      );
    } catch (err) {
      throw new EventManagerError("Error Initializing Event Manager", err);
    }
  }
  public async close() {
    return adapter.disconnect();
  }

  private addMetasToPayload(
    payload: IEventPayload,
    eventName: string
  ): IEventPayload {
    if (!this.options.metas) {
      return payload;
    } else {
      const metas = {
        guid: uuid(),
        name: eventName,
        application: this.options.application,
        timestamp: Date.now()
      };
      if (isOverrideMetasFunction(this.options.metas)) {
        return { _metas: this.options.metas(metas), ...payload };
      } else {
        return { _metas: metas, ...payload };
      }
    }
  }
}

function isOverrideMetasFunction(func: any): func is OverrideMetasFunction {
  return {}.toString.call(func) === "[object Function]";
}
