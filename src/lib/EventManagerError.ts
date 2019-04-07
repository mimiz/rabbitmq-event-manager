export class EventManagerError extends Error {
  // inherited from Error
  public name: string = "EventManagerError";
  public message: string = "EventManagerError: An error occured";
  public cause?: Error = undefined;

  constructor(message?: string, cause?: Error) {
    super(message);
    if (cause) {
      this.cause = cause;
    }
  }
}
