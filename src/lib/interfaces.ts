export interface IPayloadMetas {
  guid: string;
  name: string;
  application: string;
  timestamp: number;
  [k: string]: any;
}
export interface IPayload {
  [k: string]: any;
  _metas?: IPayloadMetas;
}
export type EventHandlerFunction = (
  payload: IPayload
) => void | Promise<boolean>;
export type OverrideMetasFunction = (metas: IPayloadMetas) => IPayloadMetas;
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
  logLevel: "error" | "debug" | "info" | "warn";
}
