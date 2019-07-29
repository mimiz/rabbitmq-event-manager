export interface IEventPayloadMetas {
  guid: string;
  name: string;
  application: string;
  timestamp: number;
  correlationId?: string;
  replyTo?: string;
  [k: string]: any;
}
export interface IEventPayload {
  [k: string]: any;
  _metas?: Partial<IEventPayloadMetas>;
}
export type EventHandlerFunction = (payload: IEventPayload) => Promise<IEventPayload | void | null>;
export type OverrideMetasFunction = (metas: IEventPayloadMetas) => IEventPayloadMetas;
export interface IEventManagerOptions {
  url: string;
  application: string;
  metas: boolean | OverrideMetasFunction;
  alternateExchangeName: string;
  alternateQueueName: string;
  deadLetterExchangeName: string;
  deadLetterQueueName: string;
  ttl: number;
  maxNumberOfMessagesRetries: number;
  logLevel: 'error' | 'debug' | 'info' | 'warn';
  logPrefix: string;
  logTransportMode: 'console' | 'mute';
  emitAndWaitTimeout: number;
  defaultResponseSuffix: string;
}

export interface IListenerOption {
  /**
   * The queue Time to live
   */
  ttl?: number;
  /**
   * Define another DeadLetterExhange (should have been defined prior usage)
   */
  dlx?: string;
}

export interface IEmitAndWaitOptions {
  emitAndWaitTimeout?: number;
}
