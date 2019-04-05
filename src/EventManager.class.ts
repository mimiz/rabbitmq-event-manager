interface IPayloadMetas {
  guid: string;
  [k: string]: any;
}
interface IPayload {
  [k: string]: any;
  _metas?: IPayloadMetas;
}
export class EventManager {
  public emit(eventName: string, payload: IPayload) {
    return;
  }
}
