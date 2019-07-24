export class EventManagerError extends Error {
  // inherited from Error
  public name: string = 'EventManagerError';
  public cause?: Error = undefined;

  constructor(message?: string, cause?: Error) {
    super(message ? message : 'EventManagerError: An error occured');
    if (cause) {
      this.cause = cause;
    }
  }
}
