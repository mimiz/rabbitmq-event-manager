# ChangeLog

- **Version 1.1.0**
  - Add ability to `emitAndWait` (emit an event and wait for a response).
  - `emit` now returns the _"full"_ payload (with real `_metas` sent to RabbitMQ)
  - Add ability to define (or override) some values in `_metas` when emitting.
  - Add possility to defined the duration for a message to be _flushed_, change the TTL of the queue created for the event (on listen).
    `eventManager.on(eventName, listener , {ttl:1000})` will be send to the dead letter exchange after one second;
  - Add possility to defined a specific dead letter exchange for a message to be _flushed_ to, change the DLX of the queue created for the event (on listen).
    `eventManager.on(eventName, listener , {dlx:'new_dlx', ttl:2000})` will be send the flushed message to the dead letter **new_dlx** after two second
