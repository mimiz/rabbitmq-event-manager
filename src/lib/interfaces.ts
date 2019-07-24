export interface IEventPayloadMetas {
  guid: string;
  name: string;
  application: string;
  timestamp: number;
  [k: string]: any;
}
export interface IEventPayload {
  [k: string]: any;
  _metas?: IEventPayloadMetas;
}
export type EventHandlerFunction = (payload: IEventPayload) => void | Promise<boolean | void>;
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
